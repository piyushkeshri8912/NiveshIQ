from pydantic import BaseModel
from typing import List

class AskRequest(BaseModel):
    query: str

class AskResponse(BaseModel):
    answer: str
    evidence: List[str]
    caveat: str
    next_steps: List[str]
