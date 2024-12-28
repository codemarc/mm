# Mail Manager (mm)

A command-line tool for managing email accounts.

## Features

- Manage multiple IMAP email accounts
- Scan and read emails from the command line
- Rules engine to organize content
- Secure password encryption
- Message metrics and account statistics
- Mark messages as read/unread
- Automated hygiene 

TODO: rules amd filters

## Installation

```bash
yarn install
```

## Usage

```bash
mm <command> [options]
```

## Commands

### show
Show email configuration and status
```bash
mm show [account] [-c] [-f] [-l] [-q] [-v]
```

### scan 
Scan email folders
```bash
mm scan [account] [-f folder] [-g] [-l limit] [-q] [-r] [-s skip] [-u] [-v] [-z]
```

### delete
Delete emails
```bash
mm delete [account] [seq] [-e] [-f folder] [-l limit] [-q] [-t] [-v]
```

### open
Open mail client
```bash
mm open [what] [-v]
```

### clean
Good hygiene meand clean mailboxes
```bash
mm clean
```

### smash
Encrypt/decrypt secrets
```bash
mm smash [-e] [-d]
```

## Configuration

Create a `.env.local` file with your configuration:

```env
MM_DEFAULT_ACCOUNT=your_default_account
```

## Environment Variables

- `MM_CRYPTOKEY`: Set this environment variable to provide the encryption key used for decrypting email configurations.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For any questions or issues, please contact [marc@codemarc.net](mailto:marc@codemarc.net).  

[I am Codemarc](https://codemarc.net)

