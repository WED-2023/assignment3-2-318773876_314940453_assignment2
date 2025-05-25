const DButils = require("./DButils");

async function markAsFavorite(user_id, recipe_id){
    await DButils.execQuery(`insert into my_favorites values ('${user_id}',${recipe_id})`);
}
exports.markAsFavorite = markAsFavorite;

async function getFavoriteRecipes(user_id){
    const recipes_id = await DButils.execQuery(`select recipe_id from my_favorites where user_id='${user_id}'`);
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


// החזרת מתכונים של משתמש מסוים (המשתמש שמחובר)
async function getUserRecipes(user_id) {
  const recipes = await DButils.execQuery(
    `SELECT * FROM recipes WHERE user_id = '${user_id}'`
  );

  // אם רוצים להחזיר בפורמט של Preview כמו בשאר המערכת:
  return recipes.map((recipe) => {
    return {
      title: recipe.title,
      image: recipe.image,
      prep_time_minutes: recipe.prep_time_minutes,
      popularity_score: recipe.popularity_score,
      tags: recipe.tags,
      has_gluten: recipe.has_gluten === 1,
      was_viewed: recipe.was_viewed === 1,
      is_favorite: recipe.is_favorite === 1,
      can_preview: recipe.can_preview === 1,
    };
  });
}
exports.getUserRecipes = getUserRecipes;