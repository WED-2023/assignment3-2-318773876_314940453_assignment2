const DButils = require("./DButils");

async function markAsFavorite(user_id, recipe_id){
    await DButils.execQuery(`insert into FavoriteRecipes values ('${user_id}',${recipe_id})`);
}
exports.markAsFavorite = markAsFavorite;

async function getFavoriteRecipes(user_id){
    const recipes_id = await DButils.execQuery(`select recipe_id from FavoriteRecipes where user_id='${user_id}'`);
    return recipes_id;
}
exports.getFavoriteRecipes = getFavoriteRecipes;

async function getLastViewedRecipes(user_id) {
  const result = await DButils.execQuery(`
    SELECT DISTINCT recipe_id
    FROM viewed_recipes
    WHERE user_id = ${user_id}
    ORDER BY viewed_at DESC
    LIMIT 3
  `);
  return result;
}
exports.getLastViewedRecipes = getLastViewedRecipes;