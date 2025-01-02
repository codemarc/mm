# Command Reference

A comprehensive guide to Mail Manager (mm) commands.

## Global Options

Available for all commands:
- `-v, --verbose`: Verbose mode
- `-q, --quiet`: Quiet mode
- `-h, --help`: Show help

## Commands

### show - Show Configuration
```bash
mm show [account] [options]
  # Account defaults to all
  -c, --counts   Show message counts
  -f, --folder   Show folder or counts
  -l, --list     Show all accounts
  -q, --quiet    Quiet mode
  -v, --verbose  Verbose mode
```
[Detailed show documentation](./show.md)

### scan - Scan Email Folders
```bash
mm scan [account] [limit] [options]
  # Account defaults to MM_DEFAULT_ACCOUNT
  # Limit defaults to MM_SCAN_LIMIT
  -b, --brief    Brief/minimal output
  -f, --folder   Specify folder to scan (default: INBOX)
  -l, --limit    Limit number of emails to scan
  -q, --quiet    Quiet mode
  -r, --read     Mark emails as read
  -s, --skip     Skip number of emails (default: 0)
  -u, --unread   Only show unread emails
  -v, --verbose  Verbose mode
```
[Detailed scan documentation](./scan.md)

### delete - Delete Email
```bash
mm delete <account> [options]
  # Account is required
  -f, --folder   Move content of named folder to trash
  -i, --index    Index(s) to delete, comma separated, ':' for range
  -s, --seqno    Seqno(s) to delete, comma separated, ':' for range
  -q, --quiet    Quiet mode
  -v, --verbose  Verbose mode
```
[Detailed delete documentation](./delete.md)

### clean - Clean Up Mailboxes
```bash
mm clean [account] [options]
  # Account defaults to all
  -q, --quiet    Quiet mode
  -v, --verbose  Verbose mode
```
[Detailed clean documentation](./clean.md)

### filter - Manage Email Filters
```bash
mm filter [account] [options]
  # Account defaults to all
  -b, --brief    Brief/minimal output
  -c, --create   Create a filter folder
  -d, --delete   Delete a filter folder
  -q, --quiet    Quiet mode
  -v, --verbose  Verbose mode
```
[Detailed filter documentation](./filter.md)

### open - Open Mail
```bash
mm open [what] [options]
  # What defaults to outlook
  -v, --verbose  Verbose mode
```
[Detailed open documentation](./open.md)

### smash - Encrypt/Decrypt Secrets
```bash
mm smash [options]
  -e, --encrypt  Encrypt secrets
  -d, --decrypt  Decrypt secrets
```
[Detailed smash documentation](./smash.md)

## Documentation

- [Show Command](./show.md) - Show configuration and status
- [Scan Command](./scan.md) - Scan email folders
- [Delete Command](./delete.md) - Delete email
- [Clean Command](./clean.md) - Clean up mailboxes
- [Filter Command](./filter.md) - Manage email filters
- [Open Command](./open.md) - Open mail client
- [Smash Command](./smash.md) - Encrypt/decrypt secrets

## See Also

- [Installation](../README.md#installation)
- [Configuration](../README.md#configuration)

