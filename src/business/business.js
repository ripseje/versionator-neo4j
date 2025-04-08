const config = require('../common/config').config;
const logger = require("ahmutils").logger(config.loggerPath).getLogger("business");
const neo4j_data = require('../data/database').neo4j
const common_utils = require('../common/utils').utils

const { execFile } = require('child_process');
const path = require('path');
const dirname = 'resources';
const route = path.resolve(__dirname, '..', '..',dirname)

const scriptPath = path.join(route, 'lib_finder.sh');
const librariesFile = path.join(route, 'libs.json');
const repositoriesFile = path.join(route, 'repos.json');

let args = [config.shellParameters.org, '', ...config.shellParameters.libraries];

const { promisify } = require('util');
const fs = require('fs/promises'); // <-- usamos fs.promises
const execFileAsync = promisify(execFile);

async function executeShellScript(project) {
    try {
        args[1] = project
        // Ejecutamos el script
        const { stdout, stderr } = await execFileAsync(scriptPath, args, { shell: true });

        if (stderr) {
            logger.warn('stderr del script:', stderr);
        }

        // Leemos los archivos JSON de forma asíncrona
        const [librariesContent, repositoriesContent] = await Promise.all([
            fs.readFile(librariesFile, 'utf-8'),
            fs.readFile(repositoriesFile, 'utf-8')
        ]);

        // Parseamos
        const libraries = JSON.parse(librariesContent);
        const repositories = JSON.parse(repositoriesContent);

        return { libraries, repositories };

    } catch (error) {
        logger.error('Error ejecutando el script o procesando JSON:', error);
        throw error;
    }
}


async function createSolutionNodes(repos, proyect){
    const label = await common_utils.labelCharacterResolver(proyect)
    const query = `
        UNWIND $names AS name
        MERGE (s:Solution:${label}{name: name})
    `;
    try {
        await neo4j_data.runQuery(query, { names: repos})
    }
    catch(error) {
        logger.error('Error running query: ', error)
        throw error;
    }
}

async function createRelations(repos){ //TODO: ver si se puede cambiar Package por la version en vez de ponerla como propiedad
    const query = `
        UNWIND $relations AS rel
        MERGE (to:Library {name: rel.to})
        MERGE (from:Solution {name: rel.from})
        WITH from, to, rel
        CALL apoc.merge.relationship(from, rel.version, {}, {}, to)
        YIELD rel AS r
        RETURN r
    `;

    const relations = [];

    for (const [service, deps] of Object.entries(repos)) {
        for (const [dep, version] of Object.entries(deps)) {
            relations.push({
                from: service,
                to: dep,
                version
            });
        }
    }

    try {
        await neo4j_data.runQuery(query, {relations: relations})
    }
    catch(error) {
        logger.error('Error running query: ', error)
        throw error;
    }
}
  
exports.business={
    executeShellScript:executeShellScript,
    createSolutionNodes:createSolutionNodes,
    createRelations:createRelations
};