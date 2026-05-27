import json
import asyncio
import sys

async def test_mcp_server():
    process = await asyncio.create_subprocess_exec(
        "python3", "ucp-mcp-server/src/server.py",
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env={"PYTHONPATH": "ucp-mcp-server/src", "MONGODB_URL": "mongodb://localhost:27017"},
        limit=1024 * 1024  # 1MB limit
    )

    # Initial initialize request (standard MCP handshake)
    init_req = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "test-client", "version": "1.0.0"}
        }
    }
    
    process.stdin.write(json.dumps(init_req).encode() + b"\n")
    await process.stdin.drain()
    
    line = await process.stdout.readline()
    print(f"Init Response: {line.decode()}")

    # UCP search_catalog test
    search_req = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "search_catalog",
            "arguments": {
                "meta": {
                    "ucp-agent": {"profile": "https://platform.example/profile.json"}
                },
                "catalog": {
                    "query": "York trackpants"
                }
            }
        }
    }
    
    process.stdin.write(json.dumps(search_req).encode() + b"\n")
    await process.stdin.drain()
    
    line = await process.stdout.readline()
    print(f"Search Response received! Length: {len(line)}")
    try:
        res = json.loads(line.decode())
        if "result" in res:
            print("Search Success!")
            # print(json.dumps(res["result"]["structuredContent"]["products"][0], indent=2))
        else:
            print(f"Search Failed: {res.get('error')}")
    except Exception as e:
        print(f"Error parsing response: {e}")

    # UCP create_checkout test
    checkout_req = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "create_checkout",
            "arguments": {
                "meta": {
                    "ucp-agent": {"profile": "https://platform.example/profile.json"}
                },
                "checkout": {
                    "line_items": [
                        {
                            "item": {"id": "TKPFCZ9EA7H5FYZH"},
                            "quantity": 1
                        }
                    ]
                }
            }
        }
    }
    
    process.stdin.write(json.dumps(checkout_req).encode() + b"\n")
    await process.stdin.drain()
    
    line = await process.stdout.readline()
    print(f"Checkout Response received! Length: {len(line)}")
    try:
        res = json.loads(line.decode())
        if "result" in res:
            print("Checkout Success!")
            print(json.dumps(res["result"]["content"][0]["text"], indent=2))
        else:
            print(f"Checkout Failed: {res.get('error')}")
    except Exception as e:
        print(f"Error parsing response: {e}")

    process.terminate()
    await process.wait()

if __name__ == "__main__":
    asyncio.run(test_mcp_server())
