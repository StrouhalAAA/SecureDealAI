"""Data types for SecureDealAI ADW system."""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field

# Task status states
TaskStatus = Literal["pending", "in_progress", "completed", "failed", "blocked"]

# Slash commands used in the ADW system
SlashCommand = Literal[
    "/implement",
    "/validate",
    "/commit",
    "/pull_request",
    "/bug",
    "/feature",
]


class AgentPromptRequest(BaseModel):
    """Claude Code agent prompt configuration."""

    prompt: str
    adw_id: str
    agent_name: str = "implementor"
    model: Literal["sonnet", "opus"] = "sonnet"
    dangerously_skip_permissions: bool = False
    output_file: str


class AgentPromptResponse(BaseModel):
    """Claude Code agent response."""

    output: str
    success: bool
    session_id: Optional[str] = None


class AgentTemplateRequest(BaseModel):
    """Claude Code agent template execution request."""

    agent_name: str
    slash_command: SlashCommand
    args: List[str]
    adw_id: str
    model: Literal["sonnet", "opus"] = "sonnet"


class ValidationResult(BaseModel):
    """Result of running a validation command."""

    command: str
    passed: bool
    output: Optional[str] = None
    error: Optional[str] = None


class ADWStateData(BaseModel):
    """Persistent state for SecureDealAI ADW workflow.

    Stored in agents/{adw_id}/adw_state.json
    """

    adw_id: str
    task_id: str
    task_name: Optional[str] = None
    phase: int
    plan_file: str
    status: TaskStatus = "pending"
    current_step: int = 0
    total_steps: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    issue_number: Optional[int] = None
    validation_results: List[ValidationResult] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    dependencies_met: bool = True
    error_message: Optional[str] = None
