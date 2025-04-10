const config = require('../common/config').config;
const neo4j_data = require('../data/database').neo4j
const common_utils = require('../common/utils').utils

const { execFile } = require('child_process');
const path = require('path');
const dirname = 'resources';
const route = path.resolve(__dirname, '..', '..',dirname)

const libFinderPath = path.join(route, config.usedFiles.libFinder);
const projectFinderPath = path.join(route, config.usedFiles.projectFinder);
const librariesFile = path.join(route, config.usedFiles.libraries);
const repositoriesFile = path.join(route, config.usedFiles.repositories);
const projectsFile = path.join(route, config.usedFiles.projectFinder);

let args = [config.shellParameters.org, ''];

const { promisify } = require('util');
const fs = require('fs/promises'); // <-- usamos fs.promises
const execFileAsync = promisify(execFile);

async function executeLibrariesFinder(project) {
    try {
        args[1] = project
        // Ejecutamos el script
        const { stdout, stderr } = await execFileAsync(libFinderPath, args, { shell: true });

        if (stderr) {
            console.log('script stderr:', stderr);
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
        console.error('Error executing the script or processing JSON.parse:', error);
        throw error;
    }
}

async function executeProjectFinder() {
    try {
        // Ejecutamos el script
        const { stdout, stderr } = await execFileAsync(projectFinderPath, args, { shell: true });

        if (stderr) {
            console.log('script stderr:', stderr);
        }

        // Leemos los archivos JSON de forma asíncrona
        const [raw_projects] = await Promise.all([
            fs.readFile(projectsFile, 'utf-8'),
        ]);

        // Parseamos
        const projects = typeof raw_projects === 'object' ? raw_projects : JSON.parse(raw_projects);

        return projects

    } catch (error) {
        console.error('Error executing the script or processing JSON.parse:', error);
        throw error;
    }
}


async function createSolutionNodes(repos, proyect){
    const label = await common_utils.labelCharacterResolver(proyect)

    const query = `
        UNWIND $names AS name
        MERGE (s:Solution {name: name})
        WITH s, name
        FOREACH (_ IN CASE WHEN name IN $libraries THEN [1] ELSE [] END |
            SET s:Library
        )
        SET s:${label}
    `;

    try {
        await neo4j_data.runQuery(query, { names: repos, libraries: config.shellParameters.libraries})
    }
    catch(error) {
        console.error('Error running query: ', error)
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
        console.error('Error running query: ', error)
        throw error;
    }
}
  
exports.business={
    executeLibrariesFinder:executeLibrariesFinder,
    executeProjectFinder:executeProjectFinder,
    createSolutionNodes:createSolutionNodes,
    createRelations:createRelations
};