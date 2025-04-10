const business = require('./business/business').business
const config = require('./common/config').config;
const logger = require("ahmutils").logger(config.loggerPath).getLogger("index");

async function execute(){
    try {

        const projects = await business.executeProjectFinder()

        logger.info('Vamos a integrar los siguientes proyectos: ', projects)

        for (const project of projects) {
            logger.info('Iniciando bajada del proyecto: ', project)
            const az_data = await business.executeLibrariesFinder(project)
            await business.createSolutionNodes(az_data.repositories, project)
            await business.createRelations(az_data.libraries)
            logger.info('Nodos creados exitosamente');
        }
        
        logger.info('Todos los proyectos han sido integrados')
        
    } catch (error) {
        logger.error('Error executing: ', error)
    }
}

async function init(){
    
    logger.info('::versionator init::')
    
    await execute();

    logger.info('::exit versionator::')

    process.exit()
}

init()