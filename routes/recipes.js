var express = require("express");
var router = express.Router();
const recipes_utils = require("./utils/recipes_utils");
const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";
const api_key = process.env.spoonacular_apiKey;

// router.get("/", (req, res) => res.send("im here"));

//הצגת המתכונים באתר
router.get("/", async (req, res, next) => {
  try {
    const user_id = req.session?.user_id;
    // כל המתכונים מהDB
    const internalRecipes = await DButils.execQuery("SELECT recipe_id, 'internal' as source FROM recipes");
    // מתכונים חיצוניים אקראיים
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
    // מיזוג כל המתכונים לרשימה אחת
    const allRecipes = [...internalRecipes, ...externalRecipes];
    // שימוש בפונקציה כדי להחזיר פרטים מקדימים
    const previews = await recipes_utils.getRecipesPreview(allRecipes, user_id);
    res.status(200).send(previews);
  } catch (error) {
    next(error);
  }
});


//החזרת 3 מתכונים רנדומליים
router.get("/3random", async (req, res, next) => {
  try {
    const randomRecipes = await recipes_utils.get3RandomRecipesPreview(3);
    res.status(200).send({ recipes: randomRecipes });
  } catch (error) {
    next(error);
  }
});


//חיפוש מתכון
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


//יצירת מתכון חדש
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
 * This path returns a full details of a recipe by its id
 */
router.get("/:recipeId", async (req, res, next) => {
  try {
    const recipe = await recipes_utils.getRecipeDetails(req.params.recipeId);
    
    // הוספת צפייה למשתמש המחובר, אם יש
    if (req.session && req.session.user_id) {
      await recipes_utils.markRecipeAsViewed(req.session.user_id, req.params.recipeId);
    }
    
    res.send(recipe);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
