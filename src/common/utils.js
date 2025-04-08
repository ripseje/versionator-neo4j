
async function labelCharacterResolver(word) {
    return word.replace(/[\s-]/g, '_');
}

exports.utils = {
    labelCharacterResolver:labelCharacterResolver
}