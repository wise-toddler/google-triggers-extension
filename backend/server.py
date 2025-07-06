from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import uuid
from datetime import datetime
import subprocess
import json
import asyncio


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class Project(BaseModel):
    id: str
    name: str
    project_number: str

class Trigger(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    github_repo: Optional[str] = None
    branch: Optional[str] = None
    disabled: bool = False

class TriggerExecutionRequest(BaseModel):
    project_id: str
    region: str
    trigger_id: str
    substitutions: Dict[str, str] = {}
    branch: Optional[str] = "main"

class BuildStatus(BaseModel):
    id: str
    status: str
    log_url: Optional[str] = None
    create_time: Optional[str] = None
    duration: Optional[str] = None


# Google Cloud Build API Functions
async def run_gcloud_command(command: List[str]) -> Dict:
    """Run gcloud command and return JSON output"""
    try:
        full_command = ["gcloud"] + command + ["--format=json"]
        process = await asyncio.create_subprocess_exec(
            *full_command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            raise HTTPException(status_code=400, detail=f"gcloud command failed: {error_msg}")
        
        result = json.loads(stdout.decode())
        return result
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse gcloud output")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Command execution failed: {str(e)}")


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Google Cloud Build VSCode Extension API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Google Cloud Build API Endpoints
@api_router.get("/auth/status")
async def check_auth_status():
    """Check if user is authenticated with gcloud"""
    try:
        command = ["auth", "list", "--filter=status:ACTIVE"]
        result = await run_gcloud_command(command)
        
        if result and len(result) > 0:
            active_account = result[0].get("account", "")
            return {"authenticated": True, "account": active_account}
        else:
            return {"authenticated": False, "account": None}
    except Exception as e:
        return {"authenticated": False, "account": None, "error": str(e)}

@api_router.get("/projects", response_model=List[Project])
async def list_projects():
    """List all available Google Cloud projects"""
    try:
        command = ["projects", "list"]
        result = await run_gcloud_command(command)
        
        projects = []
        for project in result:
            projects.append(Project(
                id=project.get("projectId", ""),
                name=project.get("name", ""),
                project_number=project.get("projectNumber", "")
            ))
        
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list projects: {str(e)}")

@api_router.get("/regions")
async def list_regions():
    """List available Google Cloud regions for Cloud Build"""
    return {
        "regions": [
            {"id": "global", "name": "Global"},
            {"id": "us-central1", "name": "US Central 1"},
            {"id": "us-east1", "name": "US East 1"},
            {"id": "us-east4", "name": "US East 4"},
            {"id": "us-west1", "name": "US West 1"},
            {"id": "us-west2", "name": "US West 2"},
            {"id": "us-west3", "name": "US West 3"},
            {"id": "us-west4", "name": "US West 4"},
            {"id": "europe-north1", "name": "Europe North 1"},
            {"id": "europe-west1", "name": "Europe West 1"},
            {"id": "europe-west2", "name": "Europe West 2"},
            {"id": "europe-west3", "name": "Europe West 3"},
            {"id": "europe-west4", "name": "Europe West 4"},
            {"id": "asia-east1", "name": "Asia East 1"},
            {"id": "asia-east2", "name": "Asia East 2"},
            {"id": "asia-northeast1", "name": "Asia Northeast 1"},
            {"id": "asia-northeast2", "name": "Asia Northeast 2"},
            {"id": "asia-northeast3", "name": "Asia Northeast 3"},
            {"id": "asia-south1", "name": "Asia South 1"},
            {"id": "asia-southeast1", "name": "Asia Southeast 1"},
            {"id": "asia-southeast2", "name": "Asia Southeast 2"},
            {"id": "australia-southeast1", "name": "Australia Southeast 1"},
            {"id": "southamerica-east1", "name": "South America East 1"}
        ]
    }

@api_router.get("/triggers/{project_id}/{region}", response_model=List[Trigger])
async def list_triggers(project_id: str, region: str):
    """List Cloud Build triggers for a project and region"""
    try:
        command = ["builds", "triggers", "list", "--project", project_id]
        if region and region != "global":
            command.extend(["--region", region])
        
        result = await run_gcloud_command(command)
        
        triggers = []
        for trigger in result:
            github_info = trigger.get("github", {})
            triggers.append(Trigger(
                id=trigger.get("id", ""),
                name=trigger.get("name", ""),
                description=trigger.get("description", ""),
                github_repo=github_info.get("name", "") if github_info else None,
                branch=github_info.get("push", {}).get("branch", "") if github_info else None,
                disabled=trigger.get("disabled", False)
            ))
        
        return triggers
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list triggers: {str(e)}")

@api_router.post("/triggers/execute")
async def execute_trigger(request: TriggerExecutionRequest):
    """Execute a Cloud Build trigger"""
    try:
        command = ["builds", "triggers", "run", request.trigger_id, "--project", request.project_id]
        
        if request.region and request.region != "global":
            command.extend(["--region", request.region])
        
        if request.branch:
            command.extend(["--branch", request.branch])
        
        # Add substitutions
        for key, value in request.substitutions.items():
            command.extend(["--substitutions", f"{key}={value}"])
        
        result = await run_gcloud_command(command)
        
        build_id = result.get("name", "").split("/")[-1] if result.get("name") else None
        
        # Store build execution in database
        build_record = {
            "id": str(uuid.uuid4()),
            "build_id": build_id,
            "project_id": request.project_id,
            "region": request.region,
            "trigger_id": request.trigger_id,
            "substitutions": request.substitutions,
            "branch": request.branch,
            "timestamp": datetime.utcnow(),
            "status": "QUEUED"
        }
        await db.builds.insert_one(build_record)
        
        return {
            "success": True,
            "build_id": build_id,
            "message": "Build triggered successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute trigger: {str(e)}")

@api_router.get("/builds/{project_id}/{build_id}")
async def get_build_status(project_id: str, build_id: str):
    """Get the status of a specific build"""
    try:
        command = ["builds", "describe", build_id, "--project", project_id]
        result = await run_gcloud_command(command)
        
        return BuildStatus(
            id=result.get("id", ""),
            status=result.get("status", "UNKNOWN"),
            log_url=result.get("logUrl", ""),
            create_time=result.get("createTime", ""),
            duration=result.get("timing", {}).get("BUILD", {}).get("endTime", "")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get build status: {str(e)}")

@api_router.get("/builds/recent/{project_id}")
async def get_recent_builds(project_id: str, limit: int = 10):
    """Get recent builds for a project"""
    try:
        command = ["builds", "list", "--project", project_id, "--limit", str(limit)]
        result = await run_gcloud_command(command)
        
        builds = []
        for build in result:
            builds.append(BuildStatus(
                id=build.get("id", ""),
                status=build.get("status", "UNKNOWN"),
                log_url=build.get("logUrl", ""),
                create_time=build.get("createTime", ""),
                duration=build.get("timing", {}).get("BUILD", {}).get("endTime", "")
            ))
        
        return builds
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recent builds: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()