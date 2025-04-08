const dotenv = require("dotenv");

dotenv.config({path: './env/'+(process.env.ENV||"local")} )

exports.config = {
    
    deamonDefault: 60000,
    deamonRepeat: 1000,
    loggerPath: process.env.LOGGER_PATH,
    shellParameters: {
        org: process.env.ORG,
        projects: JSON.parse(process.env.PROJECTS),
        libraries: JSON.parse(process.env.LIBRARIES)
    },
    neo4j: {
        uri: process.env.NEO_URI,
        user: process.env.NEO_USER,
        password: process.env.NEO_PWD
    }
};