#!/usr/bin/env python3
import unittest
import requests
import json
import os
from unittest.mock import patch, MagicMock
import sys

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://9cd040cc-83ac-4b72-9a66-2f43c1b022c7.preview.emergentagent.com"
API_BASE_URL = f"{BACKEND_URL}/api"

class GoogleCloudBuildExtensionTests(unittest.TestCase):
    """Test suite for Google Cloud Build Extension backend API"""

    def setUp(self):
        """Set up test environment"""
        self.api_base_url = API_BASE_URL
        print(f"Testing against API at: {self.api_base_url}")

    def test_root_endpoint(self):
        """Test the root endpoint returns the expected message"""
        response = requests.get(f"{self.api_base_url}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["message"], "Google Cloud Build VSCode Extension API")

    def test_auth_status_endpoint(self):
        """Test the authentication status endpoint"""
        response = requests.get(f"{self.api_base_url}/auth/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # The response should have an 'authenticated' field
        self.assertIn('authenticated', data)
        
        # The response should also have an 'account' field
        self.assertIn('account', data)
        
        # Print the authentication status for debugging
        print(f"Authentication status: {data}")
        
        # If not authenticated, there might be an error message
        if not data['authenticated'] and 'error' in data:
            print(f"Auth error: {data['error']}")

    def test_projects_endpoint(self):
        """Test the projects listing endpoint"""
        response = requests.get(f"{self.api_base_url}/projects")
        
        # Check if the response is successful or if it returns an expected error
        if response.status_code == 200:
            data = response.json()
            # Verify the structure of the response
            self.assertIsInstance(data, list)
            
            # If there are projects, check their structure
            if data:
                project = data[0]
                self.assertIn('id', project)
                self.assertIn('name', project)
                self.assertIn('project_number', project)
                
                print(f"Found {len(data)} projects. First project: {project['name']} (ID: {project['id']})")
            else:
                print("No projects found. This could be normal if no projects exist or if not authenticated.")
        else:
            # If not authenticated, we might get an error
            print(f"Projects endpoint returned status code {response.status_code}")
            print(f"Response: {response.text}")
            
            # If the error is due to authentication, this is expected
            if "Failed to list projects" in response.text and "not logged in" in response.text.lower():
                print("Error is due to not being authenticated with gcloud, which is expected in test environment")
            else:
                self.fail(f"Unexpected error from projects endpoint: {response.text}")

    def test_regions_endpoint(self):
        """Test the regions listing endpoint"""
        response = requests.get(f"{self.api_base_url}/regions")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Verify the structure of the response
        self.assertIn('regions', data)
        self.assertIsInstance(data['regions'], list)
        
        # Check that we have the expected number of regions
        # The server.py has 23 regions defined
        self.assertGreaterEqual(len(data['regions']), 20)
        
        # Check the structure of a region
        region = data['regions'][0]
        self.assertIn('id', region)
        self.assertIn('name', region)
        
        # Verify some specific regions exist
        region_ids = [region['id'] for region in data['regions']]
        expected_regions = ['global', 'us-central1', 'us-east1', 'europe-west1']
        for expected_region in expected_regions:
            self.assertIn(expected_region, region_ids)
            
        print(f"Found {len(data['regions'])} regions")

    def test_triggers_endpoint(self):
        """Test the triggers listing endpoint"""
        # First, get a list of projects to use a real project ID
        projects_response = requests.get(f"{self.api_base_url}/projects")
        
        # If we can't get projects, use a mock project ID
        if projects_response.status_code != 200 or not projects_response.json():
            test_project_id = "test-project-id"
            print(f"Using mock project ID: {test_project_id}")
        else:
            # Use the first project from the list
            projects = projects_response.json()
            test_project_id = projects[0]['id']
            print(f"Using real project ID: {test_project_id}")
        
        # Test with global region
        region = "global"
        response = requests.get(f"{self.api_base_url}/triggers/{test_project_id}/{region}")
        
        # Check if the response is successful or if it returns an expected error
        if response.status_code == 200:
            data = response.json()
            # Verify the structure of the response
            self.assertIsInstance(data, list)
            
            # If there are triggers, check their structure
            if data:
                trigger = data[0]
                self.assertIn('id', trigger)
                self.assertIn('name', trigger)
                self.assertIn('description', trigger)
                
                print(f"Found {len(data)} triggers for project {test_project_id} in region {region}")
                print(f"First trigger: {trigger['name']} (ID: {trigger['id']})")
            else:
                print(f"No triggers found for project {test_project_id} in region {region}")
        else:
            # If not authenticated or project doesn't exist, we might get an error
            print(f"Triggers endpoint returned status code {response.status_code}")
            print(f"Response: {response.text}")
            
            # If the error is due to authentication or invalid project, this is expected in test
            if "Failed to list triggers" in response.text:
                print("Error is expected in test environment without proper gcloud setup")
            else:
                self.fail(f"Unexpected error from triggers endpoint: {response.text}")

    def test_trigger_execution_endpoint(self):
        """Test the trigger execution endpoint"""
        # Create a test request body
        test_request = {
            "project_id": "test-project-id",
            "region": "us-central1",
            "trigger_id": "test-trigger-id",
            "substitutions": {
                "_BRANCH": "main",
                "_ENV": "test"
            },
            "branch": "main"
        }
        
        # Send the request
        response = requests.post(
            f"{self.api_base_url}/triggers/execute",
            json=test_request
        )
        
        # Check if the response is successful or if it returns an expected error
        if response.status_code == 200:
            data = response.json()
            # Verify the structure of the response
            self.assertIn('success', data)
            self.assertIn('build_id', data)
            self.assertIn('message', data)
            
            print(f"Trigger execution response: {data}")
        else:
            # In test environment, we expect an error since we're using fake data
            print(f"Trigger execution endpoint returned status code {response.status_code}")
            print(f"Response: {response.text}")
            
            # If the error is due to invalid trigger or project, this is expected
            if "Failed to execute trigger" in response.text:
                print("Error is expected in test environment with mock data")
            else:
                self.fail(f"Unexpected error from trigger execution endpoint: {response.text}")

    def test_error_handling(self):
        """Test error handling for invalid requests"""
        # Test with invalid project ID
        invalid_project_id = "invalid-project-id-that-does-not-exist"
        region = "global"
        response = requests.get(f"{self.api_base_url}/triggers/{invalid_project_id}/{region}")
        
        # We expect an error response
        self.assertNotEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('detail', data)
        print(f"Error handling test (invalid project): {data['detail']}")
        
        # Test trigger execution with invalid data
        invalid_request = {
            "project_id": "invalid-project",
            "region": "invalid-region",
            "trigger_id": "invalid-trigger",
            "substitutions": {}
        }
        
        response = requests.post(
            f"{self.api_base_url}/triggers/execute",
            json=invalid_request
        )
        
        # We expect an error response
        self.assertNotEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('detail', data)
        print(f"Error handling test (invalid trigger execution): {data['detail']}")


if __name__ == "__main__":
    unittest.main(argv=['first-arg-is-ignored'], exit=False)