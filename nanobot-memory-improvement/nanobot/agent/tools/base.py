"""
Base Tool class for nanobot agent.

This is a minimal implementation for testing. In the actual nanobot,
this would be imported from nanobot.agent.tools.base.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict


class Tool(ABC):
    """
    Abstract base class for agent tools.

    Tools must implement:
    - name: Identifier for the tool
    - description: Explanation for the LLM
    - parameters: JSON Schema for inputs
    - execute: Async method to run the tool
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Tool identifier used in function calls."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Description of what the tool does (shown to LLM)."""
        pass

    @property
    @abstractmethod
    def parameters(self) -> Dict[str, Any]:
        """JSON Schema defining expected parameters."""
        pass

    @abstractmethod
    async def execute(self, **kwargs) -> str:
        """
        Execute the tool with given parameters.

        Args:
            **kwargs: Parameters as defined in the schema

        Returns:
            String result to show the LLM
        """
        pass

    def to_schema(self) -> Dict[str, Any]:
        """Convert to OpenAI function schema format."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            }
        }

    def validate_params(self, params: Dict[str, Any]) -> str | None:
        """
        Validate parameters against schema.

        Args:
            params: Parameters to validate

        Returns:
            Error message if invalid, None if valid
        """
        schema = self.parameters

        # Check required parameters
        required = schema.get("required", [])
        for param in required:
            if param not in params:
                return f"Missing required parameter: {param}"

        # Check types (basic validation)
        properties = schema.get("properties", {})
        for param, value in params.items():
            if param in properties:
                expected_type = properties[param].get("type")
                if expected_type and not self._check_type(value, expected_type):
                    return f"Parameter '{param}' has wrong type, expected {expected_type}"

        return None

    @staticmethod
    def _check_type(value: Any, expected: str) -> bool:
        """Check if value matches expected JSON Schema type."""
        type_map = {
            "string": str,
            "integer": int,
            "number": (int, float),
            "boolean": bool,
            "array": list,
            "object": dict,
        }

        if expected not in type_map:
            return True  # Unknown type, skip check

        return isinstance(value, type_map[expected])
