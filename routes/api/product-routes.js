const router = require('express').Router();
const { Product, Category, Tag, ProductTag } = require('../../models');

// The `/api/products` endpoint

// get all products
router.get('/', async (req, res) => {
  try {
    const productData = await Product.findAll({
      include: [{ model: Category }, { model: Tag }]
    });
    res.status(200).json(productData);
  } catch (err) {
    res.status(500).json(err);
  }
});

// get one product
router.get('/:id', async (req, res) => {
    try {
      const productData = await Product.findByPk(req.params.id, {
        include: [{ model: Category }, { model: Tag }]
      });
      if (!productData) {
        res.status(404).json({ message: 'No product found with this id' });
        return;
      }
      res.status(200).json(productData);
    } catch (err) {
      res.status(500).json(err);
    }
  });

  // create new product
  router.post('/', async (req, res) => {
    try {
      // Destructure the data from req.body
      const { product_name, price, stock, tagIds } = req.body;
  
      // Create the new product instance in the database
      const newProduct = await Product.create({
        product_name,
        price,
        stock,
      });
  
      // If tagIds are provided, create productTag instances for the new product
      if (tagIds && tagIds.length) {
        const productTags = tagIds.map((tagId) => ({
          product_id: newProduct.id,
          tag_id: tagId,
        }));
        await ProductTag.bulkCreate(productTags);
      }
  
      // Send a response with the newly created product
      res.status(200).json(newProduct);
    } catch (err) {
      console.log(err);
      res.status(500).json(err);
    }
  });
  // update product
  router.put('/:id', (req, res) => {
    // update product data
    Product.update(req.body, {
      where: {
        id: req.params.id,
      },
    })
      .then((product) => {
        // find all associated tags from ProductTag
        return ProductTag.findAll({ where: { product_id: req.params.id } });
      })
      .then((productTags) => {
        // get list of current tag_ids
        const productTagIds = productTags.map(({ tag_id }) => tag_id);
        // create filtered list of new tag_ids
        const newProductTags = req.body.tagIds
          .filter((tag_id) => !productTagIds.includes(tag_id))
          .map((tag_id) => {
            return {
              product_id: req.params.id,
              tag_id,
            };
          });
        // figure out which ones to remove
        const productTagsToRemove = productTags
          .filter(({ tag_id }) => !req.body.tagIds.includes(tag_id))
          .map(({ id }) => id);

        // run both actions
        return Promise.all([
          ProductTag.destroy({ where: { id: productTagsToRemove } }),
          ProductTag.bulkCreate(newProductTags),
        ]);
      })
      .then((updatedProductTags) => res.json(updatedProductTags))
      .catch((err) => {
        // console.log(err);
        res.status(400).json(err);
      });
  });

  router.delete('/:id', async (req, res) => {
    try {
      // Find the product with the given id and delete it
      const rowsDeleted = await Product.destroy({
        where: {
          id: req.params.id
        }
      });
  
      // If the product was successfully deleted, send a success message
      if (rowsDeleted > 0) {
        res.status(200).json({ message: 'Product deleted successfully.' });
      } else {
        // If the product was not found, send a 404 error
        res.status(404).json({ message: 'Product not found.' });
      }
    } catch (err) {
      // If there was an error, send a 500 error with the error message
      console.log(err);
      res.status(500).json(err);
    }
  });

  module.exports = router;
