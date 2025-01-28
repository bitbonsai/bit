# 🌱 bit

> Better Install This

[![npm version](https://badge.fury.io/js/%40mauricio.wolff%2Fbit.svg)](https://www.npmjs.com/package/@mauricio.wolff/bit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Built by [BitBonsai](https://github.com/bitbonsai)

## What's this?

Just an amazing tool to help you spin up web projects faster. No magic, just convenience.

## Installation

```bash
npm install -g @mauricio.wolff/bit

# Check installation
bit version
```

## Quick Start

### Create a project

```bash
bit new my-cool-project
```

### Start development

```bash
bit start
```

### Deploy

```bash
# Deploy everything (default: fly.io)
bit deploy

# Choose provider
bit deploy --provider hetzner

# Deploy specific parts
bit deploy --pb-only  # Only PocketBase
bit deploy --web-only # Only Astro

# Configure provider
bit deploy setup hetzner
```

## What You Get

- 🚀 Astro.js project (latest version)
- 📦 PocketBase database
- 🐳 Docker setup
- 🚢 Multiple deployment options:
  - fly.io
  - Hetzner Cloud
- 🧪 Testing setup
- 🔄 Auto-update system

## Commands That Actually Work

### Project Commands
- `bit new` - Start a new project
- `bit start` - Run local development
- `bit deploy` - Ship it to production

### Docker Commands (via PocketBase)
- `bit pb setup` - First-time setup
- `bit pb start` - Start container
- `bit pb stop` - Stop container
- `bit pb logs [-f]` - Show container logs
- `bit pb shell` - Access container shell
- `bit pb cleanup` - Clean up

### Database Commands
- `bit db studio` - Open PocketBase Admin UI
- `bit db backup` - Create database backup
- `bit db migrate` - Create new migration

### Deploy Commands
- `bit deploy` - Deploy everything
- `bit deploy setup [provider]` - Configure provider
- `bit deploy --pb-only` - Deploy only PocketBase
- `bit deploy --web-only` - Deploy only Astro
- `bit deploy --provider [name]` - Select provider

### System Commands
- `bit version` - Show current version
- `bit upgrade` - Upgrade to latest version

## Deployment Configuration

Create a `bit.config.json` in your project root:

```json
{
  "provider": "fly", // or "hetzner"
  "region": "dfw",
  "pb": {
    "name": "my-project-pb",
    "resources": {
      "memory": "256MB",
      "cpu": 1
    }
  },
  "web": {
    "name": "my-project-web",
    "resources": {
      "memory": "512MB",
      "cpu": 1
    }
  }
}
```

## Supported Providers

### fly.io (default)
- Requires fly CLI
- Free tier available
- Global edge deployment

### Hetzner Cloud
- Requires HCLOUD_TOKEN
- More control over infrastructure
- Lower cost for larger apps

## Project Structure

```
my-project/
├── apps/
│   ├── web/          # Astro app
│   └── pb/           # PocketBase
│       ├── pb_data/
│       ├── pb_migrations/
│       ├── pb_hooks/
│       ├── Dockerfile
│       └── package.json
├── .github/
│   └── workflows/
└── bit.config.json   # Deployment config
```

## Contributing

Found a bug? Open an issue.
Want a feature? Send a PR.
No complicated guidelines. Just be cool.

## License

MIT © BitBonsai
