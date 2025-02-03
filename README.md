# bit CLI

A modern project scaffolding tool that creates a full-stack development environment with:
- Monorepo structure
- Docker Compose setup
- PocketBase integration
- Astro app with a clean folder structure

<video width="100%" controls>
  <source src="bit-new.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

## Installation

```bash
npm install -g @mauricio.wolff/bit
```

## Usage

### Create a new project
```bash
bit new my-project
```

### Start development environment
```bash
bit start
```

### Stop Development Environment
```bash
bit stop
```
Stops all running Docker services for your project.

### Deploy Your Project
```bash
# Deploy entire project (web and PocketBase)
bit deploy

# Deploy only web app
bit deploy:web

# Deploy only PocketBase
bit deploy:pb
```
Deploys your project to Fly.io. Requires:
- Fly.io CLI installed (`flyctl`)
- `fly.toml` configurations in `apps/web` and/or `apps/pb`

- `bit deploy`: Deploys both web and PocketBase if configs exist
- `bit deploy:web`: Deploys only the web application
- `bit deploy:pb`: Deploys only PocketBase

## Features

- 🏗️ **Monorepo Structure**: Organized project layout for multiple packages
- 🐳 **Docker Compose**: Pre-configured development environment
- 🚀 **PocketBase**: Integrated backend with authentication and database
- ⭐ **Astro**: Modern frontend with optimal performance
- 💅 **Clean UI**: Beautiful command-line interface with progress indicators

## Project Structure

```
my-project/
├── packages/
│   ├── frontend/     # Astro application
│   └── shared/       # Shared utilities
├── pocketbase/
│   ├── pb_data/
│   ├── pb_migrations/
│   └── pb_hooks/
├── docker-compose.yml
└── README.md
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/) (for deployment)
- [Bun](https://bun.sh/) or npm

## Configuration

### PocketBase Admin Credentials

You can set default PocketBase admin credentials in `~/.bit-conf.json`:

```json
{
  "pocketbase": {
    "admin": {
      "email": "your@email.com",
      "password": "your-secure-password"
    }
  }
}
```

If not set, you'll be prompted to enter credentials during project creation.

## Troubleshooting

- Ensure Docker is running before starting your project
- Check that ports 4321 (Astro) and 8090 (PocketBase) are available
- For deployment issues, verify Fly.io CLI is installed and configured

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Link the CLI: `npm link`
4. Run `bit` to see available commands

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License
