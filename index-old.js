import ForceGraph from "undp-energy-graph";

const params = {
  method: "GET",
  mode: "cors",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
};

async function init() {
  try {
    // Extract full knowledge graph here. Purpose being to assign attributes/properties to nodes, since entity-level json only contain entity names
    const [response] = await Promise.all([
      fetch("/api/UNDP-Data/dsc-energy-knowledge-graph/main/00_API/00_Merged/merged-knowledge-graph.json", params)
    ]);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    const allNodes = result['knowledge graph'].entities

    const searchedEntity = "Africa"

    const { nodes, links } = await updateEntityGraph(searchedEntity, allNodes)

    // Execute the function to generate a new network
    const graph = ForceGraph(
      { nodes, links },
      {
        containerSelector: "#app",
        nodeId: "entity",
        sourceId: "Subject",
        targetId: "Object",
        nodeGroup: "category",
        width: window.innerWidth,
        height: window.innerHeight,
        nodeStyles: {
          strokeWidth: 2
        },
        linkStyles: {
          strokeWidth: "Relevance",
        },
        labelStyles: {
          visibility: 'visible',
          label: "entity",
          edge: {
            visibility: 'visible',
            label: "Relation",
          }
        },
        containerStyles: {
          //"theme": 'light',
          "background-color": '#212121',
          //"background-color": '#1C2542'
        }
      }
    );
    
    // Each time the chatbot is interacted with, an entity name is generated and the graph is updated
    // This entity search is just temporary solution to mock a graph update
    const searchInput = document.getElementById("search-input");
    searchInput.addEventListener('keydown', async function(event) {
      if (event.key === 'Enter' || event.keyCode === 13) {
        const { nodes: newNodes, links: newLinks } = await updateEntityGraph(searchInput.value, allNodes)
        graph.update({
          nodes: newNodes,
          links: newLinks
        })
      }
    });
    
    // To expand the graph upon node click (ie. to see more connections another hop away)
    // The clicked data object can also be used to extract new information
    graph.on('nodeClick', (event) => {
      console.log('Node clicked Data:', event.clickedNodeData);
      graph.update({
        nodes: [{
          entity: 'Test',
          category: "Skill"
        }],
        links: [{
          "Relation": "focuses_on",
          "Subject": "Test",
          "Object": event.clickedNodeData.id,
        }],
        redraw: false
      })
    })

    // To search for a node 
    //graph.search("UNDP") 

    // To reset search
    //graph.closeSearch()
    
    //activate nearest neighbour search upon click of nodes. by default NN search is not activated.
    //graph.showNearestNeighbour()

  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

async function updateEntityGraph(searchedEntity, allNodes) {
  // Extract new entity json from github
  const [response] = await Promise.all([
    fetch(`/api/UNDP-Data/dsc-energy-knowledge-graph/main/00_API/01_By-Entity/${searchedEntity}.json`, params)
  ])

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();

  // Since there is only one entity in the json, constructing the graph based on relations data by creating entities (ie. nodes) from the  source and target
  let links = result['knowledge graph'].relations[searchedEntity]
  let nodes = allNodes.filter(d => d.entity === searchedEntity)
  links.forEach(d => {
    let srcNode = allNodes.find(d => d.entity === searchedEntity)
    let targetNode = allNodes.find(d => d.entity === d['Object'])
    nodes.push({"entity": searchedEntity, ...srcNode})
    nodes.push({"entity": d['Object'], ...targetNode})
    d.Subject = searchedEntity
  })

  // May not be needed in future: Check for duplicate nodes and links, particularly so since we are constructing the graph only based on relations data
  const uniqueNodes = nodes.reduce((acc, node) => {
    // Check if a node with the same 'entity' already exists in the accumulator
    const existingNode = acc.find((n) => n.entity === node.entity);
    // If not found, add the current node to the accumulator
    if (!existingNode) {
      acc.push(node);
    } 
    return acc;
  }, []);

  const uniqueLinks = links.reduce((acc, link) => {
    // Check if a link with the same 'Subject' and 'Object' already exists in the accumulator
    const existingLink = acc.find(
      (l) => l.Subject === link.Subject && l.Object === link.Object
    );
    // If not found, add the current link to the accumulator
    if (!existingLink) {
      acc.push(link);
    }
    return acc;
  }, []);

  return {nodes: uniqueNodes, links: uniqueLinks}
}

init();

