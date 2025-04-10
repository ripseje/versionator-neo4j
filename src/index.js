const business = require('./business/business').business
const config = require('./common/config').config;

async function execute(){
    try {

        const projects = await business.executeProjectFinder()

        for (const project of projects) {
            console.log(`Starting setup/download of the ${project} project`)
            const az_data = await business.executeLibrariesFinder(project)
            await business.createSolutionNodes(az_data.repositories, project)
            await business.createRelations(az_data.libraries)
        }
        
        console.log('All projects have been successfully integrated')
        
    } catch (error) {
        console.error('Error executing: ', error)
    }
}

async function init(){
    
    console.log('::versionator init::')
    
    await execute();

    console.log('::versionator end::')

    process.exit()
}

init()