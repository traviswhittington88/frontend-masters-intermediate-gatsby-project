// remote file node
const fetch = require('node-fetch');
const { createRemoteFileNode } = require('gatsby-source-filesystem');

const authors = require('./src/data/authors.json');
const books = require('./src/data/books.json');

exports.sourceNodes = ({ actions, createNodeId, createContentDigest }) => {
  const { createNode, createTypes } = actions;

  createTypes(`
    type Author implements Node {
      books: [Book!]! @link(from: "slug" by: "author.slug")
    }

    type Book implements Node {
      author: Author! @link(from: "author" by: "slug")
    }
  `);

  authors.forEach((author) => {
    createNode({
      ...author,
      id: createNodeId(`author-${author.slug}`),
      parent: null,
      children: [],
      internal: {
        type: 'Author',
        content: JSON.stringify(author),
        contentDigest: createContentDigest(author),
      },
    });
  });

  books.forEach((book) => {
    createNode({
      ...book,
      id: `book-${book.isbn}`,
      parent: null,
      children: [],
      internal: {
        type: 'Book',
        content: JSON.stringify(book),
        contentDigest: createContentDigest(book),
      },
    });
  });

  // const node = {
  //   id: createNodeId(`some-unique-string`),
  //   parent: null,
  //   children: [],
  //   internal: {
  //     type: 'MyCustomType',
  //     content: JSON.stringify(nodeContent),
  //     contentDigest: createContentDigest(nodeContent),
  //   },
  // };
};

// create custom pages
exports.createPages = ({ actions }) => {
  const { createPage } = actions;

  createPage({
    path: '/custom',
    component: require.resolve('./src/templates/custom.js'),
    context: {
      title: 'A Custom Page!',
      meta: {
        description: 'A custom page with context',
      },
    },
  });
};

// custom resolvers
exports.createResolvers = ({
  actions,
  cache,
  createNodeId,
  createResolvers,
  store,
  reporter,
}) => {
  const { createNode } = actions;
  const resolvers = {
    Book: {
      buyLink: {
        type: 'String',
        resolve: (source) =>
          `https://www.powells.com/searchresults?keyword=${source.isbn}`,
      },
      cover: {
        type: 'File',
        resolve: async (source) => {
          // make request to openlibrary.org
          // this url contains everything about the book but we only want cover at this time.
          // we are interested in the covers array within the response which contains an array of cover ids
          const response = await fetch(
            `https://openlibrary.org/isbn/${source.isbn}.json`,
          );

          if (!response.ok) {
            reporter.warn(
              `Error loading details about ${source.name} - got ${response.status} ${response.statusText}`,
            );
            return null;
          }
          // destructure the covers array from the rest of the response
          const { covers } = await response.json();
          // make sure a cover is provided
          if (covers.length) {
            return createRemoteFileNode({
              // the source url of the remote file
              url: `https://covers.openlibrary.org/b/id/${covers[0]}-L.jpg`,
              // instead of using openlibraries CDN we download a physical copy of the asset using Gatsby helpers
              store,
              cache,
              createNode,
              createNodeId,
              reporter,
            });
          } else {
            return null;
          }
        },
      },
    },
  };
  // call resolvers
  createResolvers(resolvers);
};
