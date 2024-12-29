# Mail Manager (mm)

A command-line IMAP email management tool focusing on automation and maintenance.

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

## Commands

### show - Display Account Information
```bash
mm show [account] [-c] [-f] [-l] [-q] [-v]
  -c, --counts   Show message statistics
  -f, --folder   Display folder structure
  -l, --list     List configured accounts
  -q, --quiet    Suppress non-essential output
  -v, --verbose  Detailed logging
```

### delete - Remove Messages
```bash
mm delete [account] [-f folder] [-i index] [-s seqno] [-q] [-v]
  -f, --folder   Select source folder
  -i, --index    Select by position (e.g. 1,2,3 or 1-3)
  -s, --seqno    Select by sequence number
  -q, --quiet    Suppress output
  -v, --verbose  Debug logging
```

### clean - Mailbox Maintenance
```bash
mm clean [account] [-q] [-v]
  -q, --quiet    Cron-job friendly output
  -v, --verbose  Show operations
```

### scan - Message Analysis
```bash
mm scan [account] [options]
  -f, --folder   Target folder
  -l, --limit    Message limit
  -u, --unread   Only unread
  -v, --verbose  Debug mode
```

## Environment Variables

- `MM_CRYPTOKEY`: Encryption key for passwords
- `MM_DEFAULT_ACCOUNT`: Default email account
- `MM_FILTERS_PATH`: Custom filter rules location
- `MM_SCAN_LIMIT`: Default scan batch size

## File Structure

```
mm/
├── src/           # Source code
├── docs/          # Command documentation
├── filters/       # Custom filter rules
└── .env.local    # Local configuration
```

## License

MIT License - See LICENSE file

## Links

- [Documentation](docs/)
- [Issue Tracker](https://github.com/yourusername/mm/issues)
- [Author Website](https://codemarc.net)

