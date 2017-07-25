# Athena

Search engine and indexer for network shares on CampusNet

## Getting Started

### Prerequisites

- [Node](https://nodejs.org), 6.11 or higher
- [MongoDB](https://www.mongodb.com), make sure it is up and running
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

Then move into the project

```
cd Athena
```

And start the server

```
sudo node server
```

(sudo is not needed for windows users)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details