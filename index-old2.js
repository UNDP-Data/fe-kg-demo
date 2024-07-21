import ForceGraph from "graph-viz";

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
    const { nodes, links } = await updateEntityGraph(['biomass'])

    // Execute the function to generate a new network
    const graph = ForceGraph(
      { nodes, links },
      {
        containerSelector: "#app",
        nodeId: "entity",
        sourceId: "Subject",
        targetId: "Object",
        //nodeGroup: "parent",
        width: window.innerWidth,
        height: window.innerHeight,
        nodeStyles: {
          strokeWidth: 2
        },
        linkStyles: {
          strokeWidth: 1.5,
        },
        labelStyles: {
          visibility: 'visible',
          label: "entity",
          edge: {
            visibility: 'hidden',
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
        const { nodes: newNodes, links: newLinks } = await updateEntityGraph([searchInput.value])
        graph.update({
          nodes: newNodes,
          links: newLinks
        })
      }
    });

    // To expand the graph upon node click (ie. to see more connections another hop away)
    // The clicked data object can also be used to extract new information
    graph.on('nodeClick', async (event) => {
      console.log('Node clicked Data:', event.clickedNodeData);
      const { nodes: newNodes, links: newLinks } = await updateEntityGraph([event.clickedNodeData.entity])
      graph.update({
        nodes: newNodes,
        links: newLinks
      })
    })

  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

async function updateEntityGraph(entities) {

  const capitalize = (str, lower = false) => (lower ? str.toLowerCase() : str).replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase());
  
  let fetchReqs = []
  entities.forEach(d => {
    const entity = d.replaceAll(' ', '%20')
    fetchReqs.push(fetch(`/api/UNDP-Data/dsc-energy-knowledge-graph/main/00_API/${entity}.json`, params))
  })

  // Extract new entity json from github
  const responses = await Promise.all(fetchReqs)

  const keys = ['level 1', 'level 2', 'level 3']

  const dataPromises = responses.map(async (response, i) => {
    const result = await response.json()
    console.log(result)
    const entity = result['metadata']['Entity']

    let links = []
    let nodes = []

    let entities = result['knowledge graph'].entities
    entities.map(d => {
      nodes.push({entity: d, type: 'main'})
    })
    nodes.push({entity, type: 'main'})

    keys.map(level => {
      let levels = result['knowledge graph'].relations[level]
      if(level === 'level 1') {
        levels.forEach(d => {
          d.Subject = result['metadata']['Entity']
        })
      }
      levels.forEach(d => {
        d.parent = entity
      })
      links = links.concat(levels)
    })

    links.forEach(d => {
      if(nodes.map(el => el.entity).indexOf(d.Subject) === -1) {
        nodes.push({entity: d.Subject, type: 'main'})
      }
      if(nodes.map(el => el.entity).indexOf(d.Object) === -1) {
        nodes.push({entity: d.Object, type: 'main'})
      }
    })

    let sub_entities = result['knowledge graph']['sub-elements']
    sub_entities.map(d => {
      nodes.push({entity: d, type: 'sub'})
    })
    
    let subelement_relations = result['knowledge graph']['subelement_relations']
    subelement_relations.forEach(d => {
      d.Subject = d.Parent
      d.Object = d['Sub-element']
    })
    links = links.concat(subelement_relations)

    // Returning the constructed nodes and links for each entity
    return { nodes, links };
  })

  // Wait for all data promises to resolve
  const dataArray = await Promise.all(dataPromises);

  // Flatten the array of nodes and links
  const flatNodes = dataArray.flatMap(data => data.nodes);
  const flatEdges = dataArray.flatMap(data => data.links);

  return {nodes: flatNodes, links: flatEdges}
}

init();


