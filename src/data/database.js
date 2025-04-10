const neo4j = require('neo4j-driver');
const config = require('../common/config').config

const driver = neo4j.driver(config.neo4j.uri, neo4j.auth.basic(config.neo4j.user, config.neo4j.password));

async function runQuery(query, params){
    const session = driver.session();
    try {
        const result = await session.run(query, params);
        console.log('Nodes created correctly');
        return result
    } catch (error) {
        console.log('Error executing query:', error);
    } finally {
        await session.close();
    }
}

async function closeDriver(){
    await driver.close();
}

exports.neo4j = {
    runQuery:runQuery,
    closeDriver:closeDriver
}