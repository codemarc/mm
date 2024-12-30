# List Command

Display configured email accounts and their settings.

## Usage

```bash
mm list [options]
```

## Description

The list command shows:
- Account aliases and indices
- Email addresses
- IMAP/SMTP servers
- Connection status
- Default account indicator

## Options

- `-v, --verbose`: Show additional details
  - Folder paths
  - OAuth status
  - Last sync time
- `-q, --quiet`: Show only account names

## Examples

```bash
# List all accounts
mm list

# Show detailed information
mm list --verbose

# Show just account names
mm list --quiet
```

## Output Format

Standard output includes:
- Index number
- Alias
- Email address
- Server type
- Connection status

## See Also

- [commands](./commands.md)
- `show` - View detailed account settings
