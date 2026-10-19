from fastmcp import FastMCP
mcp = FastMCP("c6")

@mcp.tool
def add(a: int, b: int) -> int:
    return a + b
