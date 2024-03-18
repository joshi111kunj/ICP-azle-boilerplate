import { v4 as uuidv4 } from 'uuid';
import { Server, StableBTreeMap, ic } from 'azle';
import express from 'express';

/**
 * `blogPostsStorage` - a key-value data structure to store blog posts.
 * We'll use a `StableBTreeMap` for durability across canister upgrades.
 * Breakdown:
 * - Key: post ID
 * - Value: BlogPost object
 */
class BlogPost {
   id: string;
   title: string;
   content: string;
   createdAt: Date;
   updatedAt: Date | null;
}

const blogPostsStorage = StableBTreeMap<string, BlogPost>(0);

export default Server(() => {
   const app = express();
   app.use(express.json());

   // Create a new blog post
   app.post("/posts", (req, res) => {
      const post: BlogPost =  {id: uuidv4(), createdAt: getCurrentDate(), ...req.body};
      blogPostsStorage.insert(post.id, post);
      res.json(post);
   });

   // Get all blog posts
   app.get("/posts", (req, res) => {
      res.json(blogPostsStorage.values());
   });

   // Get a specific blog post by ID
   app.get("/posts/:id", (req, res) => {
      const postId = req.params.id;
      const postOpt = blogPostsStorage.get(postId);
      if ("None" in postOpt) {
         res.status(404).send(`Blog post with id=${postId} not found`);
      } else {
         res.json(postOpt.Some);
      }
   });

   // Update an existing blog post
   app.put("/posts/:id", (req, res) => {
      const postId = req.params.id;
      const postOpt = blogPostsStorage.get(postId);
      if ("None" in postOpt) {
         res.status(400).send(`Could not update blog post with id=${postId}. Post not found`);
      } else {
         const post = postOpt.Some;
         const updatedPost = { ...post, ...req.body, updatedAt: getCurrentDate()};
         blogPostsStorage.insert(post.id, updatedPost);
         res.json(updatedPost);
      }
   });

   // Delete a blog post
   app.delete("/posts/:id", (req, res) => {
      const postId = req.params.id;
      const deletedPost = blogPostsStorage.remove(postId);
      if ("None" in deletedPost) {
         res.status(400).send(`Could not delete blog post with id=${postId}. Post not found`);
      } else {
         res.json(deletedPost.Some);
      }
   });

   return app.listen();
});

// Utility function to get the current date
function getCurrentDate() {
   const timestamp = new Number(ic.time());
   return new Date(timestamp.valueOf() / 1000_000);
}
