# MailMinder

MailMinder is a command-line tool designed to manage and display email configurations and perform email folder scans.

## Features

- Display email account configurations.
- Scan email folders.
- Supports quiet mode for minimal output.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/mailminder.git
   cd mailminder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Ensure you have a `config.yml` file in the root directory with your email configurations.

## Usage

Run the `mm` command with the desired options:

- To show the configuration:
  ```bash
  ./mm show
  ```

- To specify an account:
  ```bash
  ./mm show -a <account_name>
  ```

- To run in quiet mode:
  ```bash
  ./mm show -q
  ```

- To scan email folders:
  ```bash
  ./mm scan
  ```

## Options

- `-a, --account`: Specify an account from the configuration.
- `-q, --quiet`: Run the command in quiet mode.

## Configuration

The application requires a `config.yml` file in the root directory. This file should contain your email account configurations in YAML format.

## Environment Variables

- `MM_CRYPTOKEY`: Set this environment variable to provide the encryption key used for decrypting email configurations.




## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For any questions or issues, please contact [marc@codemarc.net](mailto:marc@codemarc.net).  

[I am Codemarc](https://codemarc.net)

