"""
Azure Blob Storage Service for Cleo
Handles document storage in Azure Blob Storage for production deployments.
Falls back to local file storage for development.
"""

import os
import logging
import hashlib
from pathlib import Path
from typing import Optional, List, Dict, Any, BinaryIO, Union
from datetime import datetime, timedelta
import mimetypes

logger = logging.getLogger(__name__)


class BlobStorageService:
    """
    Azure Blob Storage service with local fallback.

    In production (Azure), documents are stored in Azure Blob Storage.
    In development, documents are stored locally in the data directory.
    """

    def __init__(self):
        self.connection_string = os.getenv('AZURE_STORAGE_CONNECTION_STRING')
        self.container_name = os.getenv('AZURE_STORAGE_CONTAINER', 'documents')
        self._blob_service_client = None
        self._container_client = None
        self._initialized = False

        # Local storage fallback
        from config.settings import LOCAL_DOCUMENT_PATH
        self.local_storage_path = Path(LOCAL_DOCUMENT_PATH)
        self.local_storage_path.mkdir(parents=True, exist_ok=True)

    @property
    def is_azure_enabled(self) -> bool:
        """Check if Azure Blob Storage is configured."""
        return bool(self.connection_string)

    def _init_azure_client(self):
        """Initialize Azure Blob Storage client."""
        if self._initialized:
            return

        if not self.connection_string:
            logger.info("Azure Blob Storage not configured - using local storage")
            self._initialized = True
            return

        try:
            from azure.storage.blob import BlobServiceClient

            self._blob_service_client = BlobServiceClient.from_connection_string(
                self.connection_string
            )
            self._container_client = self._blob_service_client.get_container_client(
                self.container_name
            )

            # Create container if it doesn't exist
            if not self._container_client.exists():
                self._container_client.create_container()
                logger.info(f"Created blob container: {self.container_name}")

            logger.info(f"Connected to Azure Blob Storage: {self.container_name}")
            self._initialized = True

        except ImportError:
            logger.warning("Azure Storage SDK not installed - using local storage")
            self._initialized = True
        except Exception as e:
            logger.error(f"Failed to connect to Azure Blob Storage: {e}")
            self._initialized = True

    def _generate_blob_name(self, filename: str, prefix: str = "") -> str:
        """
        Generate a unique blob name with optional prefix.

        Args:
            filename: Original filename
            prefix: Optional folder prefix (e.g., "knowledge/", "user-uploads/")

        Returns:
            Unique blob name
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        name_hash = hashlib.md5(f"{filename}{timestamp}".encode()).hexdigest()[:8]
        safe_filename = "".join(c if c.isalnum() or c in '.-_' else '_' for c in filename)

        if prefix:
            prefix = prefix.rstrip('/') + '/'

        return f"{prefix}{timestamp}_{name_hash}_{safe_filename}"

    def upload_file(
        self,
        file_data: Union[bytes, BinaryIO],
        filename: str,
        prefix: str = "",
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Upload a file to storage.

        Args:
            file_data: File content as bytes or file-like object
            filename: Original filename
            prefix: Optional folder prefix
            content_type: MIME type (auto-detected if not provided)
            metadata: Optional metadata dictionary

        Returns:
            Dictionary with storage details (path, url, size, etc.)
        """
        self._init_azure_client()

        # Detect content type if not provided
        if not content_type:
            content_type, _ = mimetypes.guess_type(filename)
            content_type = content_type or 'application/octet-stream'

        blob_name = self._generate_blob_name(filename, prefix)

        # Convert file-like object to bytes
        if hasattr(file_data, 'read'):
            file_bytes = file_data.read()
        else:
            file_bytes = file_data

        file_size = len(file_bytes)

        if self._container_client:
            # Upload to Azure Blob Storage
            try:
                blob_client = self._container_client.get_blob_client(blob_name)

                blob_client.upload_blob(
                    file_bytes,
                    content_settings={
                        'content_type': content_type
                    },
                    metadata=metadata or {},
                    overwrite=True
                )

                blob_url = blob_client.url

                logger.info(f"Uploaded to Azure Blob Storage: {blob_name}")

                return {
                    'storage_type': 'azure_blob',
                    'blob_name': blob_name,
                    'url': blob_url,
                    'filename': filename,
                    'content_type': content_type,
                    'size': file_size,
                    'container': self.container_name,
                    'uploaded_at': datetime.utcnow().isoformat()
                }

            except Exception as e:
                logger.error(f"Error uploading to Azure Blob Storage: {e}")
                # Fall back to local storage
                return self._upload_local(file_bytes, blob_name, filename, content_type, file_size)
        else:
            # Local storage
            return self._upload_local(file_bytes, blob_name, filename, content_type, file_size)

    def _upload_local(
        self,
        file_bytes: bytes,
        blob_name: str,
        filename: str,
        content_type: str,
        file_size: int
    ) -> Dict[str, Any]:
        """Upload file to local storage."""
        local_path = self.local_storage_path / blob_name
        local_path.parent.mkdir(parents=True, exist_ok=True)

        with open(local_path, 'wb') as f:
            f.write(file_bytes)

        logger.info(f"Saved to local storage: {local_path}")

        return {
            'storage_type': 'local',
            'blob_name': blob_name,
            'local_path': str(local_path),
            'filename': filename,
            'content_type': content_type,
            'size': file_size,
            'uploaded_at': datetime.utcnow().isoformat()
        }

    def download_file(self, blob_name: str) -> Optional[bytes]:
        """
        Download a file from storage.

        Args:
            blob_name: The blob/file name to download

        Returns:
            File content as bytes, or None if not found
        """
        self._init_azure_client()

        if self._container_client:
            try:
                blob_client = self._container_client.get_blob_client(blob_name)
                download = blob_client.download_blob()
                return download.readall()
            except Exception as e:
                logger.error(f"Error downloading from Azure Blob Storage: {e}")
                # Try local fallback
                return self._download_local(blob_name)
        else:
            return self._download_local(blob_name)

    def _download_local(self, blob_name: str) -> Optional[bytes]:
        """Download file from local storage."""
        local_path = self.local_storage_path / blob_name

        if local_path.exists():
            with open(local_path, 'rb') as f:
                return f.read()

        logger.warning(f"File not found in local storage: {blob_name}")
        return None

    def delete_file(self, blob_name: str) -> bool:
        """
        Delete a file from storage.

        Args:
            blob_name: The blob/file name to delete

        Returns:
            True if deleted successfully
        """
        self._init_azure_client()

        if self._container_client:
            try:
                blob_client = self._container_client.get_blob_client(blob_name)
                blob_client.delete_blob()
                logger.info(f"Deleted from Azure Blob Storage: {blob_name}")
                return True
            except Exception as e:
                logger.error(f"Error deleting from Azure Blob Storage: {e}")
                return self._delete_local(blob_name)
        else:
            return self._delete_local(blob_name)

    def _delete_local(self, blob_name: str) -> bool:
        """Delete file from local storage."""
        local_path = self.local_storage_path / blob_name

        if local_path.exists():
            local_path.unlink()
            logger.info(f"Deleted from local storage: {blob_name}")
            return True

        return False

    def get_file_url(
        self,
        blob_name: str,
        expiry_hours: int = 24
    ) -> Optional[str]:
        """
        Get a URL for accessing a file.

        For Azure Blob Storage, generates a SAS URL with expiry.
        For local storage, returns None (use download_file instead).

        Args:
            blob_name: The blob/file name
            expiry_hours: URL expiry time in hours (Azure only)

        Returns:
            URL string or None
        """
        self._init_azure_client()

        if self._container_client:
            try:
                from azure.storage.blob import generate_blob_sas, BlobSasPermissions

                blob_client = self._container_client.get_blob_client(blob_name)

                # Check if blob exists
                if not blob_client.exists():
                    return None

                # Generate SAS token
                sas_token = generate_blob_sas(
                    account_name=self._blob_service_client.account_name,
                    container_name=self.container_name,
                    blob_name=blob_name,
                    account_key=self._blob_service_client.credential.account_key,
                    permission=BlobSasPermissions(read=True),
                    expiry=datetime.utcnow() + timedelta(hours=expiry_hours)
                )

                return f"{blob_client.url}?{sas_token}"

            except Exception as e:
                logger.error(f"Error generating SAS URL: {e}")
                return None

        return None

    def list_files(
        self,
        prefix: str = "",
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        List files in storage.

        Args:
            prefix: Filter by prefix/folder
            limit: Maximum number of files to return

        Returns:
            List of file metadata dictionaries
        """
        self._init_azure_client()

        if self._container_client:
            try:
                blobs = self._container_client.list_blobs(
                    name_starts_with=prefix if prefix else None
                )

                files = []
                for blob in blobs:
                    if len(files) >= limit:
                        break
                    files.append({
                        'name': blob.name,
                        'size': blob.size,
                        'content_type': blob.content_settings.content_type,
                        'last_modified': blob.last_modified.isoformat() if blob.last_modified else None,
                        'metadata': blob.metadata
                    })

                return files

            except Exception as e:
                logger.error(f"Error listing Azure Blob Storage: {e}")
                return self._list_local(prefix, limit)
        else:
            return self._list_local(prefix, limit)

    def _list_local(self, prefix: str, limit: int) -> List[Dict[str, Any]]:
        """List files from local storage."""
        files = []
        search_path = self.local_storage_path

        if prefix:
            search_path = search_path / prefix

        if not search_path.exists():
            return files

        for path in search_path.rglob('*'):
            if path.is_file() and len(files) < limit:
                stat = path.stat()
                content_type, _ = mimetypes.guess_type(str(path))

                files.append({
                    'name': str(path.relative_to(self.local_storage_path)),
                    'size': stat.st_size,
                    'content_type': content_type or 'application/octet-stream',
                    'last_modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'metadata': {}
                })

        return files

    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics."""
        self._init_azure_client()

        stats = {
            'storage_type': 'azure_blob' if self._container_client else 'local',
            'container': self.container_name if self._container_client else str(self.local_storage_path),
            'total_files': 0,
            'total_size': 0
        }

        files = self.list_files(limit=10000)
        stats['total_files'] = len(files)
        stats['total_size'] = sum(f.get('size', 0) for f in files)
        stats['total_size_mb'] = round(stats['total_size'] / (1024 * 1024), 2)

        return stats


# Singleton instance
_blob_storage_service: Optional[BlobStorageService] = None


def get_blob_storage_service() -> BlobStorageService:
    """Get the singleton BlobStorageService instance."""
    global _blob_storage_service
    if _blob_storage_service is None:
        _blob_storage_service = BlobStorageService()
    return _blob_storage_service


# Convenience functions
def upload_document(
    file_data: Union[bytes, BinaryIO],
    filename: str,
    metadata: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """Upload a document to storage."""
    return get_blob_storage_service().upload_file(
        file_data,
        filename,
        prefix="knowledge/",
        metadata=metadata
    )


def download_document(blob_name: str) -> Optional[bytes]:
    """Download a document from storage."""
    return get_blob_storage_service().download_file(blob_name)


def delete_document(blob_name: str) -> bool:
    """Delete a document from storage."""
    return get_blob_storage_service().delete_file(blob_name)
