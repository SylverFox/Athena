# Athena

Search engine and indexer for network shares on CampusNet

## Getting Started

### Prerequisites

- [Node](https://nodejs.org)



### Installing

Clone the repository

```
git clone https://github.com/SylverFox/Athena.git
```

Then move into the project with `cd Athena` and install dependencies

```
npm install
```

>For windows users, you might need Visual C++ components if you run into compilation problems. The easiest way to install these is running the following command **as adminstrator**
>```
>npm install -g windows-build-tools
>```

and start the server `npm start`

If you are running the app on production, make sure to set the node environment variable to production before starting

- **linux**: `export NODE_ENV=production`
- **windows**: `set NODE_ENV=production`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
