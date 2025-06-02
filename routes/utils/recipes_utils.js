const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";
const api_key = process.env.spoonacular_apiKey;
const DButils = require("./DButils");
const e = require("express");
require("dotenv").config();

/**
 * Get recipes list from spooncular response and extract the relevant recipe data for preview
 * @param {*} recipes_info 
 */


/**
 * Get full recipe details from Spoonacular by recipe ID
 */
async function getRecipeInformation(recipe_id) {
    return await axios.get(`${api_domain}/${recipe_id}/information`, {
        params: {
            includeNutrition: false,
            apiKey: api_key
        }
    });
}


/**
 * Extract a preview object from full recipe data
 */
function extractPreview(recipe_info) {
  const {
    id,
    title,
    readyInMinutes,
    image,
    aggregateLikes,
    vegan,
    vegetarian,
    glutenFree
  } = recipe_info;

  let tags = null;
  if (vegan) tags = "טבעוני";
  else if (vegetarian) tags = "צמחוני";

  return {
    id,
    title,
    prep_time_minutes: readyInMinutes,
    image,
    tags,
    has_gluten: !glutenFree,
    was_viewed: false,
    is_favorite: false,
    can_preview: true
  };
}
exports.extractPreview = extractPreview;


/**
 * Get preview objects for multiple recipes (internal + external), including view status
 * help function for the favorites function in user.js
*/   
async function getRecipesPreview(recipe_entries, user_id) {
  try {
    const previews = await Promise.all(
      recipe_entries.map(async ({ recipe_id, source }) => {
        let isViewed = false;

        //if there is a logged-in user, check if they have viewed the recipe
        if (user_id) {
          const result = await DButils.execQuery(`
            SELECT * FROM viewed_recipes
            WHERE user_id = '${user_id}' AND recipe_id = '${recipe_id}'
          `);
          isViewed = result.length > 0;
        }

        if (source === "internal") {
          // internal
          const result = await DButils.execQuery(`SELECT * FROM recipes WHERE recipe_id = ${recipe_id}`);
          if (!result || result.length === 0) {
            throw new Error("Recipe not found in internal DB");
          }
          const recipe = result[0];
          return {
            id: recipe.recipe_id,
            title: recipe.title,
            prep_time_minutes: recipe.prep_time_minutes,
            image: recipe.image,
            tags: recipe.tags,
            has_gluten: recipe.has_gluten === 1,
            was_viewed: isViewed,
            is_favorite: recipe.is_favorite === 1,
            can_preview: recipe.can_preview === 1,
          };
        } else {
          // external
          const response = await axios.get(`${api_domain}/${recipe_id}/information`, {
            params: {
              includeNutrition: false,
              apiKey: api_key,
            },
          });
          const preview = extractPreview(response.data);
          preview.was_viewed = isViewed;
          return preview;
        }
      })
    );

    return previews;
  } catch (error) {
    throw new Error("Failed to get recipe previews: " + error.message);
  }
}
exports.getRecipesPreview = getRecipesPreview;


/**
 * Get full recipe details (including ingredients & instructions)
 */
async function getRecipeDetails(recipe_id) {
  let recipe_info = await getRecipeInformation(recipe_id);
  recipe_info = recipe_info.data;
  const {
    id,
    title,
    readyInMinutes,
    image,
    aggregateLikes,
    vegan,
    vegetarian,
    glutenFree,
    extendedIngredients,
    instructions,
    servings
  } = recipe_info;
  let tags = null;
  if (vegan) tags = "טבעוני";
  else if (vegetarian) tags = "צמחוני";
  return {
    id,
    title,
    prep_time_minutes: readyInMinutes,
    image,
    tags,
    has_gluten: !glutenFree,
    ingredients: extendedIngredients.map(ing => ({
      name: ing.name,
      amount: ing.original
    })),
    instructions,
    servings,
    was_viewed: false,
    is_favorite: false,
    can_preview: true
  };
}
exports.getRecipeDetails = getRecipeDetails;


/**
 * Mark a recipe as viewed by a user
 */
async function markRecipeAsViewed(user_id, recipe_id) {
  await DButils.execQuery(`
    INSERT INTO viewed_recipes (user_id, recipe_id, viewed_at, source)
    VALUES ('${user_id}', '${recipe_id}', CURRENT_TIMESTAMP, 'external')
  `);
}
exports.markRecipeAsViewed = markRecipeAsViewed;


/**
 * Create a new internal recipe in the system
 */
async function createNewRecipe(user_id, recipeData) {
  const {
    image,
    title,
    prep_time_minutes,
    tags,
    has_gluten,
    ingredients,
    instructions,
    servings
  } = recipeData;
  // basic validation
  if (!title || !ingredients || !instructions) {
    const error = new Error("Missing required fields");
    error.status = 400;
    throw error;
  }
  // has_gluten: true/false -> 1/0
  const hasGlutenValue = has_gluten ? 1 : 0;
  const wasViewedValue = 0;
  const isFavoriteValue = 0;
  const canPreviewValue = 1;
  // insert the new recipe into the database
  await DButils.execQuery(`
    INSERT INTO recipes (
      user_id, image, title, prep_time_minutes,
      tags, has_gluten, was_viewed, is_favorite, can_preview, ingredients, instructions, servings
    ) VALUES (
      '${user_id}', '${image}', '${title}', '${prep_time_minutes}', 0,
      '${tags}', '${hasGlutenValue}',  '${wasViewedValue}', '${isFavoriteValue}', '${canPreviewValue}','${JSON.stringify(ingredients)}', '${instructions}', '${servings}'
    )
  `);
  return {
    title,
    image,
    prep_time_minutes,
    tags,
    has_gluten: hasGlutenValue,
    ingredients,
    instructions,
    servings
  };
}
exports.createNewRecipe = createNewRecipe;

/**
 * Get 3 random recipes from Spoonacular API in preview format
 */
async function get3RandomRecipesPreview(number) {
  const response = await axios.get(`${api_domain}/random`, {
    params: {
      number,
      apiKey: api_key
    }
  });
  return response.data.recipes.map((recipe) => {
    return {
      image: recipe.image,
      title: recipe.title,
      prep_time_minutes: recipe.readyInMinutes,
      tags: recipe.vegetarian ? "צמחוני" : "טבעוני",
      has_gluten: recipe.glutenFree === false,
      was_viewed: false,
      is_favorite: false,
      can_preview: true,
    };
  });
}
exports.get3RandomRecipesPreview = get3RandomRecipesPreview;

/**
 * Perform an advanced recipe search using Spoonacular
 */
async function searchRecipesAdvanced({
  query,
  cuisine,
  diet,
  intolerances,
  sortBy,
  number = 5
}) {
  try {
    const response = await axios.get(`${api_domain}/complexSearch`, {
      params: {
        query,
        cuisine: cuisine?.join(","),
        diet,
        intolerances: intolerances?.join(","),
        sort: sortBy === "time" ? "readyInMinutes" : "popularity",
        number,
        addRecipeInformation: true,
        apiKey: api_key
      }
    });

    const results = response.data.results.map((recipe) => {
      return {
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        prep_time_minutes: recipe.readyInMinutes,
        tags: recipe.vegetarian ? "צמחוני" : recipe.vegan ? "טבעוני" : null,
        has_gluten: recipe.glutenFree === false,
        was_viewed: false,
        is_favorite: false,
        can_preview: true
      };
    });

    return results;
  } catch (error) {
    throw new Error("Request failed with status code " + error.response?.status);
  }
}
exports.searchRecipesAdvanced = searchRecipesAdvanced;
