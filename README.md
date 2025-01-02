# Mail Minder (mm)

__Code to Manage Your Inbox__  
A command-line email management tool focusing on 
automation and maintenance.

## Features

- Manage multiple IMAP email accounts
- Selective message deletion by index or sequence numbers
- Automated mailbox cleanup and maintenance
- Secure password encryption with configurable key
- Message metrics and folder statistics
- Smart folder detection for Gmail and standard IMAP
- Quiet mode for cron jobs and automation

## Installation

```bash
# Clone repository
git clone https://github.com/yourusername/mm.git
cd mm

# Install dependencies
yarn install

# Create local config
cp .env.defaults .env.local

# Create your mail configuration
cp config.sample.yml config.yml
```

## Configuration

Edit `.env.local` with your settings:

```bash
# Required - encryption key for email passwords
MM_CRYPTOKEY="your-secret-key"

# Optional - default email account
MM_DEFAULT_ACCOUNT="work"

# Optional - filter path for custom rules
MM_FILTERS_PATH="./filters"
```
Then update your `config.yml`

```yml
version: 1
accounts:
  - account: birdie
    type: imap
    user: abirdietoldme@gmail.com
    password: IMapOrAppPasswword
    host: imap.gmail.com
    port: 993
    tls: true
    filters:
      - recommendations@discover.pinterest.com
      - blacklist:birdie
```

Before you use the config you encrypt its secrets

```bash
$ mm smash -e
Encrypted all passwords
```

## Commands

See [Command Reference](docs/commands.md) for detailed documentation of all available commands.

## File Structure

```
mm/
├── src/           # Source code
├── docs/          # Command documentation
├── filters/       # Custom filter rules
├── config.yml     # Email configuration file
└── .env.local     # Local environment settings
```

## License

[MIT License](LICENSE)

## Links

- [Documentation](docs/commands.md)
- [Issue Tracker](https://github.com/codemarc/mm/issues)
- [Author Website](https://codemarc.net)
