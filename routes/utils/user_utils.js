const DButils = require("./DButils");


/**
 * Mark a recipe as favorite for the logged-in user
 * Determines if the recipe is from internal or external source and inserts into my_favorites table
 */
async function markAsFavorite(user_id, recipe_id){
    let source = 'external';

    const result = await DButils.execQuery(`SELECT * FROM recipes WHERE recipe_id = ${recipe_id}`);
    if (result.length > 0) {
      source = 'internal';
    }

    await DButils.execQuery(`
    INSERT INTO my_favorites (user_id, recipe_id, source)
    VALUES ('${user_id}', ${recipe_id}, '${source}')
    `);

}
exports.markAsFavorite = markAsFavorite;


/**
 * Get list of recipe IDs and sources marked as favorite by the user
 */
async function getFavoriteRecipes(user_id) {
  const recipes = await DButils.execQuery(`
    SELECT recipe_id, source
    FROM my_favorites
    WHERE user_id = '${user_id}'
  `);
  return recipes;
}
exports.getFavoriteRecipes = getFavoriteRecipes;


/**
 * Get the last 3 viewed recipes by the user, ordered by most recent view
 */
async function getLastViewedRecipes(user_id) {
  const result = await DButils.execQuery(`
    SELECT vr.recipe_id, vr.source
    FROM viewed_recipes vr
    JOIN (
      SELECT recipe_id, MAX(viewed_at) AS max_viewed
      FROM viewed_recipes
      WHERE user_id = ${user_id}
      GROUP BY recipe_id
    ) latest ON vr.recipe_id = latest.recipe_id AND vr.viewed_at = latest.max_viewed
    WHERE vr.user_id = ${user_id}
    ORDER BY vr.viewed_at DESC
    LIMIT 3
  `);
  return result;
}
exports.getLastViewedRecipes = getLastViewedRecipes;


/**
 * Get all internal recipes created by the logged-in user
 * Returns a list of preview format objects
 */
async function getUserRecipes(user_id) {
  const recipes = await DButils.execQuery(
    `SELECT * FROM recipes WHERE user_id = '${user_id}'`
  );
  return recipes.map((recipe) => {
    return {
      title: recipe.title,
      image: recipe.image,
      prep_time_minutes: recipe.prep_time_minutes,
      tags: recipe.tags,
      has_gluten: recipe.has_gluten === 1,
      was_viewed: recipe.was_viewed === 1,
      is_favorite: recipe.is_favorite === 1,
      can_preview: recipe.can_preview === 1,
    };
  });
}
exports.getUserRecipes = getUserRecipes;
