"""NexCRM Backend API Tests"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# ── Auth ──────────────────────────────────────────────────────────────────────
class TestAuth:
    def test_health(self):
        r = requests.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_login_admin(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@nexcrm.io", "password": "Admin@123!"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"

    def test_login_manager(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "sarah.chen@nexcrm.io", "password": "Manager@123!"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "manager"

    def test_login_analyst(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "marcus.johnson@nexcrm.io", "password": "Analyst@123!"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "analyst"

    def test_login_invalid(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "wrong@email.com", "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_endpoint(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert r.json()["role"] == "admin"


# ── Dashboard ─────────────────────────────────────────────────────────────────
class TestDashboard:
    def test_stats(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        data = r.json()
        assert "total_customers" in data
        assert "active_deals" in data
        assert "total_revenue" in data
        assert "win_rate" in data
        assert data["total_customers"] == 12
        assert data["active_deals"] == 7

    def test_revenue_chart(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/revenue", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert len(r.json()) == 12

    def test_pipeline_chart(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/pipeline", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert len(r.json()) == 6

    def test_recent_deals(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/recent-deals", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200

    def test_activity(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/activity", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200


# ── Customers ─────────────────────────────────────────────────────────────────
class TestCustomers:
    def test_list_customers(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/customers", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert r.json()["total"] == 12

    def test_search_customers(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/customers?search=TechVision", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert r.json()["total"] >= 1

    def test_create_customer(self, admin_token):
        r = requests.post(f"{BASE_URL}/api/customers", json={
            "name": "TEST_Customer One", "email": "testcust@test.com", "company": "TEST_Corp",
            "industry": "Technology", "status": "lead"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_Customer One"
        assert "id" in data
        requests.delete(f"{BASE_URL}/api/customers/{data['id']}", headers={"Authorization": f"Bearer {admin_token}"})

    def test_analyst_cannot_create(self, analyst_token):
        r = requests.post(f"{BASE_URL}/api/customers", json={
            "name": "TEST_Analyst Customer", "company": "TEST_Corp2", "status": "lead"
        }, headers={"Authorization": f"Bearer {analyst_token}"})
        assert r.status_code == 403


# ── Deals ─────────────────────────────────────────────────────────────────────
class TestDeals:
    def test_list_deals(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/deals", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert r.json()["total"] > 0

    def test_pipeline_stages(self, admin_token):
        for stage in ["lead", "qualified", "proposal", "negotiation"]:
            r = requests.get(f"{BASE_URL}/api/deals?stage={stage}", headers={"Authorization": f"Bearer {admin_token}"})
            assert r.status_code == 200


# ── Tasks ─────────────────────────────────────────────────────────────────────
class TestTasks:
    def test_list_tasks(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/tasks", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert r.json()["total"] > 0

    def test_create_and_update_task(self, admin_token):
        r = requests.post(f"{BASE_URL}/api/tasks", json={
            "title": "TEST_Task", "priority": "medium", "status": "todo"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        tid = r.json()["id"]
        r2 = requests.put(f"{BASE_URL}/api/tasks/{tid}", json={"status": "done"}, headers={"Authorization": f"Bearer {admin_token}"})
        assert r2.status_code == 200
        assert r2.json()["status"] == "done"
        requests.delete(f"{BASE_URL}/api/tasks/{tid}", headers={"Authorization": f"Bearer {admin_token}"})


# ── Users ─────────────────────────────────────────────────────────────────────
class TestUsers:
    def test_list_users_admin(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/users", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        users = r.json()
        assert len(users) == 3
        names = [u["name"] for u in users]
        assert "Adam Pierce" in names
        assert "Sarah Chen" in names
        assert "Marcus Johnson" in names

    def test_list_users_manager_forbidden(self, manager_token):
        r = requests.get(f"{BASE_URL}/api/users", headers={"Authorization": f"Bearer {manager_token}"})
        assert r.status_code == 403


# ── Fixtures ──────────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@nexcrm.io", "password": "Admin@123!"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="session")
def manager_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "sarah.chen@nexcrm.io", "password": "Manager@123!"})
    return r.json()["token"]

@pytest.fixture(scope="session")
def analyst_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "marcus.johnson@nexcrm.io", "password": "Analyst@123!"})
    return r.json()["token"]
