var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");
const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";
const api_key = process.env.spoonacular_apiKey;

// router.get("/", (req, res) => res.send("im here"));

/**
 * This path returns all recipes (internal and random external) for main display
 */
router.get("/", async (req, res, next) => {
  try {
    const user_id = req.session?.user_id;
    // Fetch internal recipes from the database
    const internalRecipes = await DButils.execQuery("SELECT recipe_id, 'internal' as source FROM recipes");
    // Fetch 10 random recipes from external API
    const externalRaw = await axios.get(`${api_domain}/random`, {
      params: {
        number: 10,
        apiKey: api_key,
      },
    });
    const externalRecipes = externalRaw.data.recipes.map((recipe) => ({
      recipe_id: recipe.id,
      source: 'external',
    }));
    // Merge all recipes into a single list
    const allRecipes = [...internalRecipes, ...externalRecipes];
    // Generate previews for all recipes
    const previews = await recipes_utils.getRecipesPreview(allRecipes, user_id);
    res.status(200).send(previews);
  } catch (error) {
    next(error);
  }
});


/**
 * This path returns 3 random external recipes for "Explore" section
 */
router.get("/3random", async (req, res, next) => {
  try {
    const randomRecipes = await recipes_utils.get3RandomRecipesPreview(3);
    res.status(200).send({ recipes: randomRecipes });
  } catch (error) {
    next(error);
  }
});


/**
 * This path performs advanced recipe search using filters and query
 */
router.get("/search", async (req, res, next) => {
  try {
    const { query, cuisine, diet, intolerances, sortBy, number} = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).send({ message: "Missing required search query" });
    }

    const recipes = await recipes_utils.searchRecipesAdvanced({
      query,
      cuisine: Array.isArray(cuisine) ? cuisine : cuisine ? [cuisine] : [],
      diet,
      intolerances: Array.isArray(intolerances) ? intolerances : intolerances ? [intolerances] : [],
      sortBy,
      number: number ? parseInt(number) : 5
    });

    if (!recipes || recipes.length === 0) {
      return res.status(404).send({ message: "No recipes found" });
    }

    res.status(200).send({ recipes });
  } catch (error) {
    next(error);
  }
});


/**
 * This path allows the logged-in user to create a new internal recipe
 */
const DButils = require("./utils/DButils");

router.post("/new", async (req, res, next) => {
  try {
    const user_id = req.session.user_id;

    if (!user_id) {
      return res.status(401).send({ message: "Unauthorized – please login first" });
    }

    const recipe = await recipes_utils.createNewRecipe(user_id, req.body);

    res.status(201).send({
      message: "Recipe successfully created",
      recipe
    });
  } catch (error) {
    next(error);
  }
});



/**
 * This path returns full details of a recipe by its ID
 * Also marks the recipe as "viewed" for the logged-in user
 */
router.get("/:recipeId", async (req, res, next) => {
  try {
    const user_id = req.session?.user_id || null;
    const recipe_id = req.params.recipeId;
    const source = req.query.source || null;

    const recipe = await recipes_utils.getRecipeDetails(recipe_id, user_id, source);

    if (user_id) {
      await recipes_utils.markRecipeAsViewed(user_id, recipe_id, source);
    }
    
    res.send(recipe);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
