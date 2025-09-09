from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional


@dataclass(frozen=True)
class CommandResult:
    success: bool
    message: str = ""
    data: Optional[Any] = None


class ICommand(ABC):
    @abstractmethod
    def execute(self) -> CommandResult: ...

    @abstractmethod
    def can_undo(self) -> bool: ...

    @abstractmethod
    def undo(self) -> None: ...


class CommandInvoker:
    def __init__(self) -> None:
        self._history: list[ICommand] = []

    def run(self, command: ICommand) -> CommandResult:
        result = command.execute()
        self._history.append(command)
        return result

    def undo_last(self) -> None:
        if not self._history:
            return
        cmd = self._history.pop()
        if cmd.can_undo():
            cmd.undo()
