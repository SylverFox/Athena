# Athena

Search engine and indexer for network shares on CampusNet

## Getting Started

### Prerequisites

- [Node](https://nodejs.org), 6.11 or higher
- [Python](https://www.python.org) and the [pysmb](https://pythonhosted.org/pysmb/) package

If you have pip on your system, the easiest way to install pysmb is

```
pip install pysmb
```

For windows users, Visual C++ components are needed. The easiest way to install these is running the following command **as adminstrator**

```
npm install -g windows-build-tools
```

### Installing

Clone the repository

```
git clone https://github.com/SylverFox/Athena.git
```

Then move into the project with `cd Athena` and install dependencies

```
npm install
```

and start the server `[sudo] npm start`

If you are running the app on production, make sure to set the node environment variable to production before starting

- **linux**: `export NODE_ENV=production`
- **windows**: `set NODE_ENV=production`

Also take a look at `config.js` for any configuration you might want to change

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details