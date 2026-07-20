"""Bank statement PDF extraction package."""

__all__ = ["parse_statement"]


def __getattr__(name: str):
    if name == "parse_statement":
        from .pipeline import parse_statement

        return parse_statement
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
