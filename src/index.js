const business = require('./business/business').business
const config = require('./common/config').config;
const logger = require("ahmutils").logger(config.loggerPath).getLogger("index");

async function execute(){
    try {
        for (const project of config.shellParameters.projects) {
            logger.info('Iniciando bajada del proyecto: ', project)
            const az_data = await business.executeShellScript(project)
            await business.createSolutionNodes(az_data.repositories, project)
            await business.createRelations(az_data.libraries)
        }     
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