# Google Cloud Build VSCode Extension

This extension allows you to manage Google Cloud Build triggers directly from VSCode without switching to the Google Cloud Console.

## Features

- **Authentication Integration**: Automatically detects gcloud CLI authentication status
- **Project Management**: Browse and select from your Google Cloud projects
- **Region Selection**: Choose the appropriate Google Cloud region for your builds
- **Trigger Management**: View and manage Cloud Build triggers
- **Custom Substitutions**: Add custom substitution variables to your builds
- **Build Execution**: Execute triggers directly from VSCode
- **Build History**: View recent builds and their status

## Prerequisites

1. **Google Cloud SDK (gcloud CLI)** must be installed on your system
2. **Authentication**: You must be authenticated with Google Cloud
3. **Project Access**: You need appropriate permissions to Cloud Build in your Google Cloud projects

## Installation

1. Download the extension package (.zip file)
2. Open VSCode
3. Go to Extensions view (Ctrl+Shift+X)
4. Click on "..." menu and select "Install from VSIX..."
5. Select the downloaded .zip file

## Setup

1. Install and configure the Google Cloud SDK:
   ```bash
   # Install gcloud CLI (if not already installed)
   # Follow instructions at: https://cloud.google.com/sdk/docs/install
   
   # Authenticate with Google Cloud
   gcloud auth application-default login
   
   # Set your default project (optional)
   gcloud config set project YOUR_PROJECT_ID
   ```

2. Open VSCode and look for the "Google Cloud Build" section in the Explorer sidebar

## Usage

### 1. Authentication
- The extension will automatically check if you're authenticated with gcloud
- If not authenticated, you'll see instructions to run: `gcloud auth application-default login`

### 2. Project Selection
- Select your Google Cloud project from the dropdown
- The extension will load available Cloud Build triggers for the selected project

### 3. Region Selection
- Choose the appropriate Google Cloud region
- Most triggers work with the "Global" region, but some may require specific regions

### 4. Trigger Management
- View all available Cloud Build triggers in your project
- Triggers are displayed with their names and status (enabled/disabled)

### 5. Build Execution
- Select a trigger from the dropdown
- Optionally modify the branch name (defaults to "main")
- Add custom substitution variables if needed
- Click "Execute Trigger" to start the build

### 6. Substitution Variables
- Click "+ Add Substitution" to add custom variables
- Enter the variable name (e.g., `_ENVIRONMENT`) and value (e.g., `production`)
- These variables will be passed to your Cloud Build configuration

### 7. Build History
- View recent builds in the table below
- See build status, creation time, and other details
- Click on log URLs to view detailed build logs in the Google Cloud Console

## Commands

- `Google Cloud Build: Open Panel` - Opens the main Google Cloud Build panel

## Configuration

The extension uses the gcloud CLI configuration from your system. No additional VSCode settings are required.

## Troubleshooting

### Authentication Issues
- Make sure gcloud CLI is installed and in your PATH
- Run `gcloud auth application-default login` to authenticate
- Verify your authentication with `gcloud auth list`

### Permission Issues
- Ensure you have the necessary Cloud Build permissions in your Google Cloud project
- Required roles: `Cloud Build Editor` or `Cloud Build Viewer` (for read-only access)

### Trigger Not Found
- Verify the trigger exists in the selected project and region
- Some triggers may be region-specific

### Build Execution Fails
- Check that the trigger is enabled
- Verify your branch name is correct
- Ensure all required substitution variables are provided

## Support

For issues and feature requests, please check the extension's repository or contact the maintainer.

## License

This extension is provided as-is for educational and development purposes.