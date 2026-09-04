---
name: docker-ops
description: Container lifecycle management via Docker MCP — build, deploy, health-check, and troubleshoot containerized services.
---

# Docker Operations Skill

Manage Docker containers, images, and services through the Docker MCP server.

## When to Use

- Building and running containerized applications
- Debugging container issues (logs, exec, inspect)
- Managing container lifecycle (start, stop, restart, remove)
- Image management (build, pull, push, prune)
- Health checking running services
- Docker Compose operations

## Available Operations

### Container Lifecycle
- `list_containers` — Show all containers (running and stopped)
- `create_container` — Create new container from image
- `start_container` / `stop_container` — Lifecycle control
- `remove_container` — Clean up stopped containers
- `container_logs` — Fetch stdout/stderr logs
- `container_exec` — Run commands inside container

### Image Management
- `list_images` — Show all local images
- `pull_image` — Download image from registry
- `build_image` — Build from Dockerfile
- `remove_image` — Clean up unused images

### Inspection
- `inspect_container` — Full container metadata
- `container_stats` — CPU, memory, network usage

## Common Workflows

### Deploy a Service
```
1. pull_image: node:20-alpine
2. create_container:
     image: node:20-alpine
     ports: ["3000:3000"]
     volumes: ["./app:/app"]
     cmd: ["node", "server.js"]
3. start_container: [container_id]
4. container_logs: [container_id] — verify startup
```

### Debug a Failing Container
```
1. list_containers (include stopped)
2. container_logs: [container_id] --tail 100
3. inspect_container: [container_id] — check exit code, env, mounts
4. container_exec: [container_id] "sh" — interactive shell
```

### Health Check
```
1. list_containers — all running services
2. container_stats — resource usage per container
3. container_logs --since 5m — recent activity
4. Report status to EOS evidence stream
```

### Clean Up
```
1. list_containers --filter status=exited
2. remove_container for each stopped container
3. list_images --dangling
4. remove_image for unused images
```

## Governance Notes

- Container operations are classified as MEDIUM RISK
- Production deployments require HUMAN_L2_APPROVAL
- Always check container logs after start/restart
- Record deployment evidence in EOS-MISSION-CONTROL
- Never expose sensitive env vars in container creation — use Docker secrets or env files
