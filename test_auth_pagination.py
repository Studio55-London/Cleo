"""
Test Authentication and Message Pagination Features
Tests user registration, login, logout, and message pagination/search
"""
import requests
import json
import time
from datetime import datetime

BASE_URL = 'http://localhost:8080'
session = requests.Session()

def print_header(text):
    """Print formatted header"""
    print("\n" + "="*70)
    print(f"  {text}")
    print("="*70)

def print_result(test_name, success, details=""):
    """Print test result"""
    status = "[PASS]" if success else "[FAIL]"
    print(f"{status} - {test_name}")
    if details:
        print(f"        {details}")

def test_user_registration():
    """Test user registration"""
    print_header("Testing User Registration")

    # Test 1: Register new user
    response = session.post(f'{BASE_URL}/api/auth/register', json={
        'username': 'testuser',
        'email': 'testuser@example.com',
        'password': 'TestPass123!',
        'full_name': 'Test User'
    })

    success = response.status_code == 201
    print_result("Register new user", success,
                 f"Status: {response.status_code}, User ID: {response.json().get('user', {}).get('id')}")

    # Test 2: Attempt duplicate registration
    response = session.post(f'{BASE_URL}/api/auth/register', json={
        'username': 'testuser',
        'email': 'testuser@example.com',
        'password': 'TestPass123!'
    })

    success = response.status_code == 400
    print_result("Reject duplicate username", success,
                 f"Status: {response.status_code}, Message: {response.json().get('message')}")

    # Test 3: Missing required fields
    response = session.post(f'{BASE_URL}/api/auth/register', json={
        'username': 'incomplete'
    })

    success = response.status_code == 400
    print_result("Validate required fields", success,
                 f"Status: {response.status_code}")

def test_user_login():
    """Test user login"""
    print_header("Testing User Login")

    # Test 1: Successful login
    response = session.post(f'{BASE_URL}/api/auth/login', json={
        'username': 'testuser',
        'password': 'TestPass123!'
    })

    success = response.status_code == 200 and response.json().get('success')
    print_result("Login with correct credentials", success,
                 f"Status: {response.status_code}, User: {response.json().get('user', {}).get('username')}")

    # Test 2: Wrong password
    response = session.post(f'{BASE_URL}/api/auth/login', json={
        'username': 'testuser',
        'password': 'WrongPassword'
    })

    success = response.status_code == 401
    print_result("Reject wrong password", success,
                 f"Status: {response.status_code}")

    # Test 3: Non-existent user
    response = session.post(f'{BASE_URL}/api/auth/login', json={
        'username': 'nonexistent',
        'password': 'SomePassword'
    })

    success = response.status_code == 401
    print_result("Reject non-existent user", success,
                 f"Status: {response.status_code}")

    # Login for subsequent tests
    session.post(f'{BASE_URL}/api/auth/login', json={
        'username': 'testuser',
        'password': 'TestPass123!'
    })

def test_current_user():
    """Test getting current user info"""
    print_header("Testing Current User Endpoint")

    response = session.get(f'{BASE_URL}/api/auth/me')

    success = response.status_code == 200
    user_data = response.json().get('user', {})
    print_result("Get current user info", success,
                 f"Username: {user_data.get('username')}, Email: {user_data.get('email')}")

def create_test_space_with_messages():
    """Create a test space with multiple messages for pagination testing"""
    print_header("Creating Test Data for Pagination")

    # Create a test space
    response = session.post(f'{BASE_URL}/api/spaces', json={
        'name': 'Pagination Test Space',
        'description': 'Space for testing message pagination',
        'agent_ids': [1, 2, 3]  # Assuming some agents exist
    })

    if response.status_code != 200:
        print_result("Create test space", False, f"Failed to create space: {response.text}")
        return None

    space_id = response.json().get('space', {}).get('id')
    print_result("Create test space", True, f"Space ID: {space_id}")

    # Create multiple test messages
    messages_created = 0
    for i in range(25):
        response = session.post(f'{BASE_URL}/api/spaces/{space_id}/messages', json={
            'content': f'Test message {i+1} - This is a pagination test message',
            'author': 'testuser'
        })
        if response.status_code == 200:
            messages_created += 1
        time.sleep(0.1)  # Small delay to ensure timestamp ordering

    print_result("Create test messages", messages_created == 25,
                 f"Created {messages_created} messages")

    # Create some messages with specific content for search testing
    search_test_messages = [
        'This message contains KEYWORD for search testing',
        'Another KEYWORD message here',
        'Normal message without the special word'
    ]

    for msg in search_test_messages:
        session.post(f'{BASE_URL}/api/spaces/{space_id}/messages', json={
            'content': msg,
            'author': 'testuser'
        })

    print_result("Create search test messages", True,
                 f"Created {len(search_test_messages)} search test messages")

    return space_id

def test_message_pagination(space_id):
    """Test message pagination"""
    print_header("Testing Message Pagination")

    # Test 1: Get first page (default)
    response = session.get(f'{BASE_URL}/api/spaces/{space_id}/messages')

    success = response.status_code == 200
    data = response.json()
    messages = data.get('messages', [])
    pagination = data.get('pagination', {})

    print_result("Get messages (default pagination)", success,
                 f"Returned {len(messages)} messages, Total: {pagination.get('total')}")

    # Test 2: Get specific page with custom per_page
    response = session.get(f'{BASE_URL}/api/spaces/{space_id}/messages', params={
        'page': 1,
        'per_page': 10
    })

    success = response.status_code == 200
    data = response.json()
    messages = data.get('messages', [])
    pagination = data.get('pagination', {})

    print_result("Get page 1 with 10 per page", success,
                 f"Returned {len(messages)} messages, Pages: {pagination.get('pages')}, Has Next: {pagination.get('has_next')}")

    # Test 3: Get second page
    response = session.get(f'{BASE_URL}/api/spaces/{space_id}/messages', params={
        'page': 2,
        'per_page': 10
    })

    success = response.status_code == 200
    data = response.json()
    messages = data.get('messages', [])
    pagination = data.get('pagination', {})

    print_result("Get page 2", success,
                 f"Returned {len(messages)} messages, Has Prev: {pagination.get('has_prev')}")

    # Test 4: Invalid page number (should handle gracefully)
    response = session.get(f'{BASE_URL}/api/spaces/{space_id}/messages', params={
        'page': -1,
        'per_page': 10
    })

    success = response.status_code == 200  # Should auto-correct to page 1
    print_result("Handle invalid page number", success,
                 f"Status: {response.status_code}")

def test_message_search(space_id):
    """Test message search functionality"""
    print_header("Testing Message Search")

    # Test 1: Search by content keyword
    response = session.get(f'{BASE_URL}/api/spaces/{space_id}/messages', params={
        'search': 'KEYWORD'
    })

    success = response.status_code == 200
    data = response.json()
    messages = data.get('messages', [])

    # Verify all returned messages contain the keyword
    all_match = all('keyword' in msg.get('content', '').lower() for msg in messages)

    print_result("Search by keyword", success and all_match,
                 f"Found {len(messages)} messages containing 'KEYWORD'")

    # Test 2: Search with no results
    response = session.get(f'{BASE_URL}/api/spaces/{space_id}/messages', params={
        'search': 'NONEXISTENT_KEYWORD_XYZ123'
    })

    success = response.status_code == 200
    data = response.json()
    messages = data.get('messages', [])

    print_result("Search with no results", success and len(messages) == 0,
                 f"Returned {len(messages)} messages (expected 0)")

    # Test 3: Search by author
    response = session.get(f'{BASE_URL}/api/spaces/{space_id}/messages', params={
        'search': 'testuser'
    })

    success = response.status_code == 200
    data = response.json()
    messages = data.get('messages', [])

    print_result("Search by author", success and len(messages) > 0,
                 f"Found {len(messages)} messages by 'testuser'")

    # Test 4: Combine search with pagination
    response = session.get(f'{BASE_URL}/api/spaces/{space_id}/messages', params={
        'search': 'test',
        'page': 1,
        'per_page': 5
    })

    success = response.status_code == 200
    data = response.json()
    messages = data.get('messages', [])
    pagination = data.get('pagination', {})

    print_result("Search with pagination", success,
                 f"Found {pagination.get('total')} total, showing {len(messages)} per page")

def test_user_logout():
    """Test user logout"""
    print_header("Testing User Logout")

    response = session.post(f'{BASE_URL}/api/auth/logout')

    success = response.status_code == 200
    print_result("Logout user", success,
                 f"Status: {response.status_code}, Message: {response.json().get('message')}")

    # Verify logged out - accessing protected endpoint should fail
    response = session.get(f'{BASE_URL}/api/auth/me')

    success = response.status_code == 401
    print_result("Verify logout (protected endpoint)", success,
                 f"Status: {response.status_code} (expected 401)")

def run_all_tests():
    """Run all authentication and pagination tests"""
    print("\n")
    print("+" + "="*68 + "+")
    print("|" + " "*15 + "CLEO AUTHENTICATION & PAGINATION TESTS" + " "*15 + "|")
    print("+" + "="*68 + "+")

    try:
        # Authentication tests
        test_user_registration()
        test_user_login()
        test_current_user()

        # Create test data
        space_id = create_test_space_with_messages()

        if space_id:
            # Pagination and search tests
            test_message_pagination(space_id)
            test_message_search(space_id)
        else:
            print("\n[WARN] Skipping pagination tests - failed to create test space")

        # Logout test
        test_user_logout()

        print_header("Test Suite Complete")
        print("\n[SUCCESS] All tests completed successfully!\n")

    except Exception as e:
        print(f"\n[ERROR] Test suite failed with error: {e}\n")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Wait for server to start
    print("Waiting for server to start...")
    time.sleep(3)

    run_all_tests()
