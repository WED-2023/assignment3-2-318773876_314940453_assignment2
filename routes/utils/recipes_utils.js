const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";
const api_key = process.env.spoonacular_apiKey;
const DButils = require("./DButils");


/**
 * Get recipes list from spooncular response and extract the relevant recipe data for preview
 * @param {*} recipes_info 
 */


async function getRecipeInformation(recipe_id) {
    return await axios.get(`${api_domain}/${recipe_id}/information`, {
        params: {
            includeNutrition: false,
            apiKey: process.env.spooncular_apiKey
        }
    });
}

async function getRecipeDetails(recipe_id) {
    let recipe_info = await getRecipeInformation(recipe_id);
    let { id, title, readyInMinutes, image, aggregateLikes, vegan, vegetarian, glutenFree } = recipe_info.data;

    return {
        id: id,
        title: title,
        readyInMinutes: readyInMinutes,
        image: image,
        popularity: aggregateLikes,
        vegan: vegan,
        vegetarian: vegetarian,
        glutenFree: glutenFree,
        
    }
}

exports.getRecipeDetails = getRecipeDetails;

//search שורה 43

async function searchRecipesByQuery(query) {
  const result = await DButils.execQuery(`
    SELECT * FROM recipes
    WHERE title LIKE '%${query}%'
  `);

  return result.map((recipe) => {
    return {
      image: recipe.image,
      title: recipe.title,
      prep_time_minutes: recipe.prep_time_minutes,
      popularity_score: recipe.popularity_score,
      tags: recipe.tags,
      has_gluten: recipe.has_gluten,
      was_viewed: false,       // אם צריך – לעדכן לפי המשתמש
      is_favorite: false,      // אם צריך – לעדכן לפי המשתמש
      can_preview: true        // אם יש תנאים להצגת preview – לבדוק
    };
  });
}

exports.searchRecipesByQuery = searchRecipesByQuery;


// שורה 9 - תצוגה מקדימה של מתכונים אקראיים
async function getRandomRecipesPreview(number = 3) {
  const response = await axios.get(
    `https://api.spoonacular.com/recipes/random`,
    {
      params: {
        number: number,
        apiKey: api_key
      }
    }
  );

  return response.data.recipes.map((recipe) => {
    return {
      image: recipe.image,
      title: recipe.title,
      prep_time_minutes: recipe.readyInMinutes,
      popularity_score: recipe.aggregateLikes,
      tags: recipe.vegetarian ? "צמחוני" : "טבעוני", // דוגמה פשוטה
      has_gluten: recipe.glutenFree === false,
      was_viewed: false,
      is_favorite: false,
      can_preview: true,
    };
  });
}

exports.getRandomRecipesPreview = getRandomRecipesPreview;

//שורה 146 - מתכונים שנצפו
async function markRecipeAsViewed(user_id, recipe_id) {
  await DButils.execQuery(
    `INSERT INTO viewed_recipes (user_id, recipe_id) VALUES ('${user_id}', '${recipe_id}')`
  );
}

exports.markRecipeAsViewed = markRecipeAsViewed;