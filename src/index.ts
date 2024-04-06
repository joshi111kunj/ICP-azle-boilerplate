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

// Utility function to get the current date
function getCurrentDate(): Date {
   return new Date(ic.time().toNumber() / 1000000);
}

// Utility function for sending error responses
function sendError(res: express.Response, statusCode: number, message: string): void {
   res.status(statusCode).json({ error: message });
}

export default Server(() => {
   const app = express();
   app.use(express.json());

   // Create a new blog post
   app.post("/posts", (req, res) => {
      const { title, content } = req.body;
      if (!title || !content) {
         return sendError(res, 400, "Title and content are required.");
      }
      
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
         return sendError(res, 404, `Blog post with id=${postId} not found`);
      }
      res.json(postOpt.Some);
   });

   // Update an existing blog post
   app.put("/posts/:id", (req, res) => {
      const postId = req.params.id;
      const postOpt = blogPostsStorage.get(postId);
      if ("None" in postOpt) {
         return sendError(res, 400, `Could not update blog post with id=${postId}. Post not found`);
      }
      const post = postOpt.Some;
      const updatedPost = { ...post, ...req.body, updatedAt: getCurrentDate()};
      blogPostsStorage.insert(post.id, updatedPost);
      res.json(updatedPost);
   });

   // Delete a blog post
   app.delete("/posts/:id", (req, res) => {
      const postId = req.params.id;
      const deletedPost = blogPostsStorage.remove(postId);
      if ("None" in deletedPost) {
         return sendError(res, 400, `Could not delete blog post with id=${postId}. Post not found`);
      }
      res.json(deletedPost.Some);
   });

   return app.listen();
});
