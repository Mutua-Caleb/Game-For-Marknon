const fact = (title, text, keywords) => ({ title, text, keywords })

const lesson = (id, section, title, page, visual, summary, notes, keyTerms, facts) => ({
  id,
  section,
  title,
  page,
  visual,
  summary,
  notes,
  keyTerms,
  facts
})

export const chemistrySections = [
  'The particle model',
  'Atoms, elements and compounds',
  'The periodic table',
  'Chemical reactions',
  'Acids and alkalis',
  'Energy changes',
  'Materials',
  'Earth and the atmosphere'
]

export const chemistryLessons = [
  lesson(
    'solids-liquids-gases',
    'The particle model',
    'Solids, liquids and gases',
    88,
    'particles',
    'Matter behaves differently in each state because its particles have different arrangements, movement and energy.',
    [
      'All matter is made of particles, which may be atoms or molecules. The three states of matter are solid, liquid and gas.',
      'Solid particles are tightly packed in a regular pattern and vibrate around fixed positions. Solids keep their shape and volume and are difficult to compress.',
      'Liquid particles stay close together but can move past one another. Liquids flow and change shape while keeping a fixed volume.',
      'Gas particles are far apart and move quickly in random directions. Gases have no fixed shape or volume, have low density and can be compressed. Collisions with a container produce pressure.',
      'Heating gives particles more energy. Water is unusual because liquid water is denser than solid ice, so ice floats.'
    ],
    ['particle', 'state of matter', 'density', 'compress', 'volume'],
    [
      fact('particles in a solid', 'They are closely packed in a regular arrangement and vibrate around fixed positions.', ['closely packed', 'regular', 'vibrate', 'fixed positions']),
      fact('particles in a liquid', 'They remain close together but move past one another, so a liquid flows and changes shape.', ['close together', 'move past', 'flows', 'changes shape']),
      fact('particles in a gas', 'They are far apart and move quickly in random directions, so a gas can be compressed.', ['far apart', 'quickly', 'random', 'compressed']),
      fact('gas pressure', 'Gas pressure is caused by gas particles colliding with the walls of their container.', ['particles', 'collide', 'walls', 'container']),
      fact('why ice floats', 'Ice floats because liquid water is denser than solid ice.', ['water', 'denser', 'ice', 'floats'])
    ]
  ),
  lesson(
    'changes-of-state',
    'The particle model',
    'Changes of state',
    90,
    'state-change',
    'Heating and cooling change particle energy and can move a substance between solid, liquid and gas without changing its mass.',
    [
      'Melting changes a solid to a liquid, freezing changes a liquid to a solid, boiling or evaporation changes a liquid to a gas, and condensation changes a gas to a liquid.',
      'Sublimation changes a solid directly to a gas. Deposition changes a gas directly to a solid.',
      'During melting, particles leave their fixed positions but remain in contact. During boiling, particles separate and move quickly in random directions.',
      'The temperature stays constant while a pure substance changes state. Water melts at 0 degrees C and boils at 100 degrees C at normal atmospheric pressure.',
      'The number of particles does not change during a state change, so mass is conserved.'
    ],
    ['melting', 'boiling', 'condensation', 'sublimation', 'conservation of mass'],
    [
      fact('melting and freezing', 'Melting changes solid to liquid; freezing changes liquid to solid.', ['melting', 'solid', 'liquid', 'freezing']),
      fact('boiling and condensation', 'Boiling changes liquid to gas; condensation changes gas to liquid.', ['boiling', 'liquid', 'gas', 'condensation']),
      fact('sublimation and deposition', 'Sublimation is solid directly to gas; deposition is gas directly to solid.', ['sublimation', 'solid', 'gas', 'deposition']),
      fact('water melting and boiling points', 'Water melts at 0 degrees C and boils at 100 degrees C at normal pressure.', ['0', 'melts', '100', 'boils']),
      fact('mass during a state change', 'Mass is conserved because the number of particles before and after the change is the same.', ['mass', 'conserved', 'number', 'particles'])
    ]
  ),
  lesson(
    'heating-cooling-curves',
    'The particle model',
    'Heating and cooling curves',
    92,
    'curve',
    'Heating curves show when energy raises particle speed and when it is used to change particle arrangement instead.',
    [
      'Internal energy is the total kinetic and potential energy stored by the particles in a substance.',
      'On a sloping part of a heating curve, temperature rises and particle kinetic energy increases. Solid particles vibrate more; liquid and gas particles move faster.',
      'On a flat part, the pure substance is changing state. Its temperature stays constant while energy increases potential energy and overcomes attractions between particles.',
      'A pure substance contains one element or one compound and has fixed melting and boiling temperatures.',
      'An impure substance contains more than one element or compound and changes state over a range of temperatures.'
    ],
    ['internal energy', 'kinetic energy', 'potential energy', 'latent energy', 'pure substance'],
    [
      fact('internal energy', 'Internal energy is the total kinetic and potential energy of the particles.', ['kinetic', 'potential', 'energy', 'particles']),
      fact('a sloping heating curve', 'Temperature and particle kinetic energy increase on a sloping section.', ['temperature', 'kinetic', 'increases', 'particles']),
      fact('a flat heating curve', 'A state change occurs at constant temperature while energy increases potential energy and overcomes attractions.', ['state change', 'constant temperature', 'potential', 'attractions']),
      fact('a pure substance', 'A pure substance contains only one element or compound and has fixed melting and boiling points.', ['one', 'element', 'compound', 'fixed']),
      fact('an impure substance heating curve', 'An impure substance melts or boils over a range of temperatures rather than at one fixed temperature.', ['range', 'temperatures', 'not fixed', 'impure'])
    ]
  ),
  lesson(
    'pressure-in-gases',
    'The particle model',
    'Pressure in gases',
    94,
    'pressure',
    'Gas pressure changes when the frequency or force of particle collisions with a container changes.',
    [
      'Brownian motion is the random movement of visible smoke or pollen particles caused by collisions with much smaller, fast-moving air particles.',
      'A gas exerts pressure when its particles collide with a surface. More frequent or harder collisions create a greater force and pressure.',
      'Adding gas particles to a flexible container increases collisions and makes the container expand.',
      'Reducing a gas volume makes particles hit the walls more often, so pressure rises.',
      'Heating a gas increases particle kinetic energy and speed. Collisions become more frequent and forceful, so pressure rises if volume is fixed.'
    ],
    ['Brownian motion', 'pressure', 'collision', 'volume', 'temperature'],
    [
      fact('Brownian motion', 'Visible particles move randomly because rapidly moving air particles collide with them from different directions.', ['random', 'air particles', 'collide', 'directions']),
      fact('the cause of gas pressure', 'Gas pressure is caused by particles colliding with the walls of a container.', ['gas particles', 'colliding', 'walls', 'container']),
      fact('adding gas to a balloon', 'More gas particles cause more wall collisions, increasing pressure and expanding the balloon.', ['more particles', 'collisions', 'pressure', 'expands']),
      fact('reducing gas volume', 'Reducing volume increases collision frequency and therefore increases pressure.', ['reduce volume', 'more often', 'collisions', 'pressure']),
      fact('heating a gas at fixed volume', 'Particles gain kinetic energy, move faster and collide more often and harder, so pressure increases.', ['kinetic energy', 'faster', 'collide', 'pressure'])
    ]
  ),
  lesson(
    'diffusion',
    'The particle model',
    'Diffusion',
    96,
    'diffusion',
    'Random particle movement spreads substances from areas of high concentration to areas of lower concentration.',
    [
      'Diffusion happens in fluids: liquids and gases. It is the net movement of particles from high concentration to low concentration.',
      'Particles move randomly. Dye placed in water begins highly concentrated in one region and eventually becomes evenly distributed.',
      'Diffusion does not require stirring, although stirring mixes a liquid more quickly.',
      'Heating increases particle speed, so diffusion happens faster at higher temperatures.',
      'Gas particles are farther apart and move more quickly than liquid particles, so diffusion is generally faster in gases.'
    ],
    ['diffusion', 'concentration', 'fluid', 'random motion', 'temperature'],
    [
      fact('the definition of diffusion', 'Diffusion is the net movement of particles from high concentration to low concentration.', ['movement', 'particles', 'high concentration', 'low concentration']),
      fact('where diffusion happens', 'Diffusion happens in fluids, which means liquids and gases.', ['fluids', 'liquids', 'gases']),
      fact('dye spreading in water', 'Random particle movement carries dye from a concentrated region until it is evenly distributed.', ['random', 'high concentration', 'spread', 'evenly']),
      fact('temperature and diffusion', 'Heating makes particles move faster, so diffusion becomes faster.', ['heating', 'particles', 'faster', 'diffusion']),
      fact('stirring and diffusion', 'Stirring speeds the mixing and spreading of particles through a liquid.', ['stirring', 'speeds', 'mixing', 'particles'])
    ]
  ),
  lesson(
    'the-atom',
    'Atoms, elements and compounds',
    'The atom',
    100,
    'atom',
    'The modern atomic model describes a tiny nucleus containing protons and neutrons, surrounded by electrons.',
    [
      'Scientific models are simplified explanations that can be changed when new evidence is found. Dalton once described atoms as indivisible, but experiments revealed smaller particles.',
      'Protons have positive charge and neutrons have no charge. Both are found in the nucleus at the centre of the atom.',
      'Electrons have negative charge and move around the nucleus. Protons and neutrons each have about 2000 times the mass of an electron.',
      'Most atomic mass is in the nucleus. An atom is neutral when it has equal numbers of positive protons and negative electrons.',
      'Peer review lets other scientists check whether evidence and conclusions are valid before research is accepted.'
    ],
    ['atom', 'nucleus', 'proton', 'neutron', 'electron'],
    [
      fact('protons', 'Protons have positive charge and are found in the nucleus.', ['positive', 'nucleus']),
      fact('neutrons', 'Neutrons have no charge and are found in the nucleus.', ['no charge', 'neutral', 'nucleus']),
      fact('electrons', 'Electrons have negative charge and move around the nucleus.', ['negative', 'around', 'nucleus']),
      fact('why an atom is neutral', 'An atom is neutral because it has equal numbers of protons and electrons.', ['equal', 'protons', 'electrons', 'neutral']),
      fact('why scientific models change', 'Models change when new, peer-reviewed experimental evidence supports a better explanation.', ['new evidence', 'experiments', 'peer review', 'model'])
    ]
  ),
  lesson(
    'elements-compounds-mixtures',
    'Atoms, elements and compounds',
    'Elements, compounds and mixtures',
    102,
    'molecules',
    'The type of atoms present and whether they are chemically joined distinguish elements, compounds and mixtures.',
    [
      'An element contains only one type of atom. More than 100 elements are listed in the periodic table.',
      'A compound contains atoms of two or more different elements that are chemically joined. Carbon dioxide contains carbon and oxygen atoms joined together.',
      'A mixture contains two or more elements or compounds that are not chemically joined. Its parts can be separated by physical methods.',
      'A diatomic element forms molecules containing two joined atoms of the same element, such as oxygen gas. A monatomic gas contains separate single atoms, such as argon.',
      'Particle diagrams use different symbols or colours for different atom types and touching symbols to show chemical bonds.'
    ],
    ['element', 'compound', 'mixture', 'diatomic', 'monatomic'],
    [
      fact('an element', 'An element is made of only one type of atom.', ['one type', 'atom']),
      fact('a compound', 'A compound contains atoms of different elements chemically joined together.', ['different elements', 'chemically joined']),
      fact('a mixture', 'A mixture contains substances together that are not chemically joined.', ['two or more', 'not chemically joined']),
      fact('a diatomic element', 'A diatomic element has molecules made from two joined atoms of the same element.', ['two', 'joined atoms', 'same element']),
      fact('argon compared with oxygen', 'Argon is monatomic with separate atoms, while oxygen is diatomic with pairs of joined oxygen atoms.', ['argon', 'monatomic', 'oxygen', 'diatomic'])
    ]
  ),
  lesson(
    'solutions',
    'Atoms, elements and compounds',
    'Making and separating solutions',
    104,
    'solution',
    'Solubility determines whether evaporation or filtration is the right way to separate a mixture.',
    [
      'A solute is the substance that dissolves. A solvent dissolves the solute. Together they form a solution.',
      'A soluble substance can dissolve in a chosen solvent; an insoluble substance cannot. Salt is soluble in water, while sand is insoluble.',
      'Heating and stirring usually make a solid solute dissolve faster because particles move and mix more quickly.',
      'Evaporation and crystallisation can recover a dissolved solute. Some solvent is evaporated, then crystals form as the remaining solution cools or evaporates.',
      'Filtration separates an insoluble solid from a liquid. Liquid passes through filter paper as the filtrate while solid remains as residue.'
    ],
    ['solute', 'solvent', 'solution', 'filtration', 'crystallisation'],
    [
      fact('solute, solvent and solution', 'A solute dissolves in a solvent to form a solution.', ['solute', 'dissolves', 'solvent', 'solution']),
      fact('soluble and insoluble substances', 'A soluble substance dissolves in a solvent; an insoluble one does not.', ['soluble', 'dissolves', 'insoluble', 'does not']),
      fact('speeding up dissolving', 'Heating and stirring make dissolving faster by increasing particle movement and mixing.', ['heating', 'stirring', 'faster', 'particles']),
      fact('recovering crystals from a solution', 'Gently evaporate some solvent and allow the solute to form crystals.', ['evaporate', 'solvent', 'solute', 'crystals']),
      fact('filtration', 'Filtration separates an insoluble solid: liquid filtrate passes through and solid residue stays on the paper.', ['insoluble solid', 'filtrate', 'passes through', 'residue'])
    ]
  ),
  lesson(
    'chromatography-distillation',
    'Atoms, elements and compounds',
    'Chromatography and distillation',
    106,
    'separation',
    'Chromatography separates dissolved substances by movement, while distillation separates using boiling and condensation.',
    [
      'In paper chromatography, a small sample is placed above the solvent level. The solvent rises through the paper and carries soluble substances with it.',
      'Different substances travel at different rates because they have different attractions to the solvent and paper. Matching spots at the same height can indicate the same substance.',
      'Simple distillation separates a solvent from a solution. The solvent boils, travels as vapour and condenses back to liquid in a cooled condenser.',
      'The dissolved solid remains in the original flask. Distilled water can therefore be collected from seawater while salt is left behind.',
      'Distillation can also separate liquids when their boiling points are sufficiently different.'
    ],
    ['chromatography', 'solvent', 'distillation', 'evaporation', 'condenser'],
    [
      fact('paper chromatography', 'A solvent rises through paper and carries dissolved substances, which separate because they move at different rates.', ['solvent', 'rises', 'dissolved', 'different rates']),
      fact('matching chromatography spots', 'Spots at the same height can show that two samples contain the same substance.', ['same height', 'same substance']),
      fact('simple distillation', 'The solvent boils into vapour, passes through a condenser and is collected as a liquid.', ['boils', 'vapour', 'condenser', 'liquid']),
      fact('separating seawater', 'Water evaporates and condenses as distilled water while salt remains behind.', ['water', 'evaporates', 'condenses', 'salt remains']),
      fact('why liquids separate by distillation', 'Liquids can be separated because they have different boiling points.', ['different', 'boiling points'])
    ]
  ),
  lesson(
    'metals-non-metals',
    'The periodic table',
    'Metals and non-metals',
    110,
    'periodic',
    'Metals and non-metals have contrasting electrical, thermal and mechanical properties that determine their uses.',
    [
      'Elements are arranged in the periodic table by atomic number and by repeating properties. They can be broadly classified as metals or non-metals.',
      'Metals are usually good electrical and thermal conductors. Non-metals are usually poor conductors and may act as insulators.',
      'Metals are generally strong, malleable and ductile. Non-metals in solid form are often brittle.',
      'Metals commonly have high melting and boiling points. Many non-metals have low melting and boiling points and are gases at room temperature.',
      'Copper is used for wire because it conducts electricity and is ductile; aluminium conducts heat in pans; steel is used in structures because it is strong.'
    ],
    ['conductor', 'insulator', 'malleable', 'ductile', 'brittle'],
    [
      fact('metal conductivity', 'Metals are generally good electrical and thermal conductors with low electrical resistance.', ['electrical', 'thermal', 'conductors', 'low resistance']),
      fact('non-metal conductivity', 'Non-metals are generally poor conductors and often act as electrical and thermal insulators.', ['poor conductors', 'electrical', 'thermal', 'insulators']),
      fact('malleable and ductile metals', 'Malleable metals can be shaped; ductile metals can be drawn into wires.', ['malleable', 'shaped', 'ductile', 'wires']),
      fact('why copper is used in wires', 'Copper conducts electricity well and is ductile enough to be drawn into thin wires.', ['conducts electricity', 'ductile', 'thin wires']),
      fact('melting point trends', 'Metals usually have high melting points, while many non-metals have low melting points.', ['metals', 'high', 'non-metals', 'low'])
    ]
  ),
  lesson(
    'periodic-table',
    'The periodic table',
    'The periodic table',
    112,
    'periodic',
    'The periodic table arranges elements so atomic number increases and elements with similar properties line up in groups.',
    [
      'Mendeleev arranged elements so those with similar properties were in the same columns. He changed strict atomic-weight order and left gaps for undiscovered elements.',
      'Later discoveries matched Mendeleev\'s predictions, supporting his model. The modern table is arranged by increasing atomic number, which is the number of protons.',
      'Each element has a chemical symbol. The atomic number is commonly displayed with the symbol.',
      'Vertical columns are groups. Elements in a group have similar properties, so group position helps predict behaviour.',
      'Horizontal rows are periods. Most metals are on the left of the stepped dividing line and non-metals are on the right.'
    ],
    ['Mendeleev', 'atomic number', 'group', 'period', 'chemical symbol'],
    [
      fact('Mendeleev\'s gaps', 'Mendeleev left gaps for undiscovered elements and predicted their properties from repeating patterns.', ['gaps', 'undiscovered', 'predicted', 'properties']),
      fact('atomic number', 'Atomic number is the number of protons and is used to order the modern periodic table.', ['number', 'protons', 'order']),
      fact('groups', 'Groups are vertical columns whose elements have similar properties.', ['vertical', 'columns', 'similar properties']),
      fact('periods', 'Periods are the horizontal rows of the periodic table.', ['horizontal', 'rows']),
      fact('metals and non-metals on the table', 'Metals are mainly to the left of the stepped line and non-metals are to the right.', ['metals', 'left', 'non-metals', 'right'])
    ]
  ),
  lesson(
    'chemical-formulae',
    'The periodic table',
    'Chemical formulae',
    114,
    'formula',
    'Chemical symbols identify elements and formulae show the types and numbers of atoms in a molecule or compound.',
    [
      'An element symbol begins with a capital letter. If it has a second letter, that letter is lower case: C is carbon and Cu is copper.',
      'A subscript shows how many atoms of the preceding element are present. O2 contains two oxygen atoms and H2O contains two hydrogen atoms and one oxygen atom.',
      'A compound contains atoms of different elements chemically joined and can have properties unlike its elements.',
      'Capitalisation matters: Co is the element cobalt, while CO contains carbon and oxygen and is carbon monoxide.',
      'Common formulae include CO2, HCl, NaCl, MgO, Al2O3, SiO2, H2SO4 and H2O.'
    ],
    ['chemical symbol', 'formula', 'subscript', 'compound', 'capital letter'],
    [
      fact('capital letters in element symbols', 'The first letter is capital and a second letter, if present, is lower case.', ['first', 'capital', 'second', 'lower case']),
      fact('the meaning of a subscript', 'A subscript tells how many atoms of the element immediately before it are present.', ['subscript', 'number', 'atoms', 'before']),
      fact('the formula H2O', 'H2O has two hydrogen atoms and one oxygen atom.', ['two', 'hydrogen', 'one', 'oxygen']),
      fact('Co compared with CO', 'Co is cobalt; CO is carbon monoxide containing carbon and oxygen.', ['Co', 'cobalt', 'CO', 'carbon monoxide']),
      fact('the formula Al2O3', 'Al2O3 contains two aluminium atoms and three oxygen atoms.', ['two', 'aluminium', 'three', 'oxygen'])
    ]
  ),
  lesson(
    'physical-chemical-changes',
    'Chemical reactions',
    'Physical changes and chemical reactions',
    118,
    'reaction',
    'Physical changes keep the same substances, while chemical reactions form new substances and show observable evidence.',
    [
      'A physical change does not change chemical composition and is usually reversible. State changes and dissolving are physical changes.',
      'A chemical reaction changes chemical composition and forms products with different properties. Rusting forms iron oxide from iron and oxygen.',
      'Evidence of reaction may include colour change, temperature change, gas bubbles, light or formation of a solid precipitate.',
      'Reactants are the starting substances and products are the substances formed.',
      'Mass is conserved in physical and chemical changes: total reactant mass equals total product mass in a closed system.'
    ],
    ['physical change', 'chemical reaction', 'reactant', 'product', 'conservation of mass'],
    [
      fact('a physical change', 'A physical change keeps the same chemical composition and is usually reversible.', ['same composition', 'reversible']),
      fact('a chemical reaction', 'A chemical reaction changes composition and forms new products.', ['changes', 'composition', 'new', 'products']),
      fact('signs of a chemical reaction', 'Signs include colour or temperature change, gas bubbles, light, or a precipitate.', ['colour', 'temperature', 'gas', 'precipitate']),
      fact('reactants and products', 'Reactants are starting substances; products are substances formed by the reaction.', ['reactants', 'starting', 'products', 'formed']),
      fact('conservation of mass', 'The total mass of reactants equals the total mass of products in a closed system.', ['mass', 'reactants', 'equals', 'products'])
    ]
  ),
  lesson(
    'oxidation-combustion',
    'Chemical reactions',
    'Oxidation and combustion',
    120,
    'reaction',
    'Oxidation adds oxygen to a substance, while combustion is rapid fuel oxidation that may be complete or incomplete.',
    [
      'Oxidation is gain of oxygen. A metal reacts with oxygen to form a metal oxide: metal + oxygen -> metal oxide.',
      'Combustion is burning a fuel. The fire triangle shows that fuel, oxygen and heat are all required.',
      'Hydrocarbons are compounds containing hydrogen and carbon and are common fuels.',
      'Complete combustion has enough oxygen and forms carbon dioxide and water.',
      'Incomplete combustion happens when oxygen is limited and can form poisonous, colourless and odourless carbon monoxide plus water.'
    ],
    ['oxidation', 'combustion', 'fuel', 'hydrocarbon', 'carbon monoxide'],
    [
      fact('oxidation', 'Oxidation is the gain of oxygen, such as a metal forming a metal oxide.', ['gain', 'oxygen', 'metal oxide']),
      fact('the fire triangle', 'Combustion requires fuel, oxygen and heat.', ['fuel', 'oxygen', 'heat']),
      fact('a hydrocarbon', 'A hydrocarbon is a compound made from hydrogen and carbon.', ['compound', 'hydrogen', 'carbon']),
      fact('complete combustion', 'Complete combustion with enough oxygen produces carbon dioxide and water.', ['enough oxygen', 'carbon dioxide', 'water']),
      fact('incomplete combustion danger', 'Limited oxygen can produce poisonous carbon monoxide, which is colourless and odourless.', ['limited oxygen', 'carbon monoxide', 'poisonous', 'colourless'])
    ]
  ),
  lesson(
    'balancing-equations',
    'Chemical reactions',
    'Balancing chemical equations',
    122,
    'equation',
    'Balanced equations conserve atoms by using coefficients without changing the formulae of substances.',
    [
      'A symbol equation uses element symbols and compound formulae to represent reactants and products.',
      'A balanced equation has the same number of each type of atom on both sides because atoms are conserved.',
      'Only whole-number coefficients in front of formulae may be changed. Subscripts must not be changed because that would change the substance.',
      'Copper oxidation begins as Cu + O2 -> CuO and balances as 2Cu + O2 -> 2CuO.',
      'A coefficient multiplies every atom in the formula. 2H2O contains four hydrogen atoms and two oxygen atoms.'
    ],
    ['balanced equation', 'coefficient', 'subscript', 'reactant', 'product'],
    [
      fact('why equations are balanced', 'The same number of every type of atom must appear on each side because atoms are conserved.', ['same number', 'each atom', 'both sides', 'conserved']),
      fact('coefficients', 'A coefficient is placed before a formula and multiplies every atom in that formula.', ['before', 'formula', 'multiplies', 'every atom']),
      fact('why subscripts cannot change', 'Changing a subscript changes the identity of the substance rather than only its amount.', ['subscript', 'changes', 'substance', 'identity']),
      fact('balanced copper oxidation', 'The balanced equation is 2Cu + O2 -> 2CuO.', ['2Cu', 'O2', '2CuO']),
      fact('atoms in 2H2O', '2H2O contains four hydrogen atoms and two oxygen atoms.', ['four', 'hydrogen', 'two', 'oxygen'])
    ]
  ),
  lesson(
    'thermal-decomposition',
    'Chemical reactions',
    'Thermal decomposition',
    124,
    'reaction',
    'Heating can break a compound into simpler products, with gas tests identifying gases that are released.',
    [
      'Thermal decomposition happens when heating breaks a compound into smaller, simpler products.',
      'A metal carbonate usually decomposes into a metal oxide and carbon dioxide.',
      'Copper carbonate is green and forms black copper oxide plus carbon dioxide: CuCO3 -> CuO + CO2.',
      'Carbon dioxide turns limewater milky or cloudy white.',
      'Hydrogen peroxide can decompose into water and oxygen. Oxygen relights a glowing splint.'
    ],
    ['thermal decomposition', 'metal carbonate', 'carbon dioxide', 'limewater', 'glowing splint'],
    [
      fact('thermal decomposition', 'Thermal decomposition is the breakdown of a compound into simpler products by heating.', ['compound', 'breakdown', 'simpler products', 'heating']),
      fact('metal carbonate decomposition', 'A heated metal carbonate usually forms a metal oxide and carbon dioxide.', ['metal carbonate', 'metal oxide', 'carbon dioxide']),
      fact('copper carbonate decomposition', 'Green copper carbonate forms black copper oxide and carbon dioxide.', ['green', 'copper carbonate', 'black', 'carbon dioxide']),
      fact('the carbon dioxide test', 'Carbon dioxide turns limewater milky or cloudy.', ['limewater', 'milky', 'cloudy']),
      fact('the oxygen test', 'Oxygen relights a glowing splint.', ['relights', 'glowing splint'])
    ]
  ),
  lesson(
    'reactivity-displacement',
    'Chemical reactions',
    'Reactivity series and displacement',
    126,
    'reactivity',
    'The reactivity series predicts reaction strength and whether one element can displace another from a compound.',
    [
      'Metals differ in reactivity. More bubbles and a faster reaction with acid usually show a more reactive metal.',
      'The reactivity series orders metals from most reactive to least reactive. Carbon and hydrogen are included because they help predict extraction and acid reactions.',
      'In displacement, a more reactive element replaces a less reactive element in a compound.',
      'Iron displaces copper from copper sulfate: iron + copper sulfate -> iron sulfate + copper.',
      'A less reactive element cannot displace a more reactive one, so gold does not react with copper sulfate.'
    ],
    ['reactivity series', 'displacement', 'more reactive', 'hydrogen', 'carbon'],
    [
      fact('the reactivity series', 'The reactivity series orders elements from most reactive to least reactive.', ['orders', 'most reactive', 'least reactive']),
      fact('a displacement reaction', 'A more reactive element replaces a less reactive element in a compound.', ['more reactive', 'replaces', 'less reactive', 'compound']),
      fact('iron in copper sulfate', 'Iron displaces copper because iron is more reactive, forming iron sulfate and copper.', ['iron', 'more reactive', 'iron sulfate', 'copper']),
      fact('gold in copper sulfate', 'No reaction occurs because gold is less reactive than copper.', ['no reaction', 'gold', 'less reactive', 'copper']),
      fact('bubbles in metal-acid reactions', 'More rapid hydrogen bubbling usually indicates that the metal is more reactive.', ['hydrogen', 'bubbles', 'faster', 'more reactive'])
    ]
  ),
  lesson(
    'group-7',
    'Chemical reactions',
    'Group 7 elements',
    128,
    'halogen',
    'The halogens are reactive non-metals with predictable trends and displacement reactions.',
    [
      'Group 7 elements are halogens. They are non-metals, poor conductors and have relatively low melting and boiling points.',
      'Melting and boiling points increase down Group 7 because larger molecules have stronger intermolecular forces.',
      'Reactivity decreases down the group. Fluorine and chlorine are more reactive than bromine and iodine.',
      'Halogen compounds are halides: fluoride, chloride, bromide, iodide and astatide.',
      'A more reactive halogen displaces a less reactive halogen from a halide. Chlorine displaces bromine from sodium bromide, but iodine cannot.'
    ],
    ['halogen', 'halide', 'Group 7', 'displacement', 'reactivity'],
    [
      fact('halogen properties', 'Halogens are reactive non-metals and poor conductors with relatively low melting and boiling points.', ['reactive', 'non-metals', 'poor conductors', 'low']),
      fact('melting points down Group 7', 'Melting and boiling points increase down Group 7.', ['increase', 'down', 'Group 7']),
      fact('reactivity down Group 7', 'Halogen reactivity decreases down Group 7.', ['reactivity', 'decreases', 'down']),
      fact('halides', 'Compounds containing halogens are called halides, such as chlorides, bromides and iodides.', ['compounds', 'halogens', 'halides']),
      fact('chlorine and sodium bromide', 'Chlorine displaces bromine because chlorine is more reactive.', ['chlorine', 'displaces', 'bromine', 'more reactive'])
    ]
  ),
  lesson(
    'acids-bases-alkalis',
    'Acids and alkalis',
    'Acids, bases and alkalis',
    132,
    'ph',
    'The pH scale classifies acids, neutral substances and alkalis, while bases neutralise acids.',
    [
      'The pH scale runs from 0 to 14. Acids have pH below 7, neutral substances have pH 7 and alkalis have pH above 7.',
      'A lower pH means a stronger acid; a higher pH means a stronger alkali. Pure water is neutral.',
      'A base is a substance that neutralises an acid. A soluble base is called an alkali.',
      'Laboratory acids include hydrochloric acid, sulfuric acid and nitric acid. Laboratory alkalis include sodium, potassium and calcium hydroxide.',
      'Strong acids and alkalis may be irritant, toxic or corrosive and require suitable hazard precautions.'
    ],
    ['acid', 'base', 'alkali', 'neutral', 'pH'],
    [
      fact('the pH scale', 'Acids are below 7, neutral is 7 and alkalis are above 7 on the pH scale.', ['acids', 'below 7', 'neutral', 'above 7']),
      fact('a base', 'A base is a substance that neutralises an acid.', ['base', 'neutralises', 'acid']),
      fact('an alkali', 'An alkali is a base that is soluble in water.', ['base', 'soluble', 'water']),
      fact('acid strength and pH', 'Stronger acids have lower pH values.', ['stronger acid', 'lower', 'pH']),
      fact('hazards of strong acids and alkalis', 'They may be irritant, toxic or corrosive and can harm people or materials.', ['irritant', 'toxic', 'corrosive', 'harm'])
    ]
  ),
  lesson(
    'ph-indicators',
    'Acids and alkalis',
    'The pH scale and indicators',
    134,
    'ph',
    'Indicators reveal whether a solution is acidic or alkaline through characteristic colour changes.',
    [
      'Blue litmus turns red in acid; red litmus turns blue in alkali.',
      'Phenolphthalein is colourless in acid or neutral solution and pink in alkali. Methyl orange is red in acid and yellow in alkali.',
      'Red cabbage indicator is pink or red in acid, purple near neutral, and blue or green in alkali.',
      'Universal indicator is a mixture of dyes that gives a gradual range of colours across pH 0 to 14.',
      'An electronic pH meter gives a numerical reading and avoids subjective colour matching.'
    ],
    ['indicator', 'litmus', 'phenolphthalein', 'universal indicator', 'pH meter'],
    [
      fact('litmus paper', 'Blue litmus turns red in acid, while red litmus turns blue in alkali.', ['blue', 'red', 'acid', 'alkali']),
      fact('phenolphthalein', 'Phenolphthalein is colourless unless it is in an alkali, where it turns pink.', ['colourless', 'alkali', 'pink']),
      fact('methyl orange', 'Methyl orange is red in acid and yellow in alkaline solution.', ['red', 'acid', 'yellow', 'alkaline']),
      fact('universal indicator', 'Universal indicator uses a mixture of dyes to show a gradual colour range for different pH values.', ['mixture', 'dyes', 'colour range', 'pH']),
      fact('an electronic pH meter', 'A pH meter gives a numerical pH without needing to judge a colour.', ['numerical', 'pH', 'no colour'])
    ]
  ),
  lesson(
    'acids-metals',
    'Acids and alkalis',
    'Acids and metals',
    136,
    'reaction',
    'Reactive metals displace hydrogen from acids to form a salt and hydrogen gas.',
    [
      'The general reaction is metal + acid -> salt + hydrogen. Fizzing, a temperature rise or flames may be observed.',
      'More reactive metals react more vigorously. Metals below hydrogen in the reactivity series, such as copper and gold, do not normally react with dilute acids.',
      'Hydrochloric acid forms chloride salts, sulfuric acid forms sulfate salts and nitric acid forms nitrate salts.',
      'Magnesium plus hydrochloric acid forms magnesium chloride and hydrogen.',
      'Zinc plus sulfuric acid forms zinc sulfate and hydrogen.'
    ],
    ['metal', 'acid', 'salt', 'hydrogen', 'reactivity series'],
    [
      fact('the metal and acid equation', 'A metal reacting with an acid forms a salt and hydrogen gas.', ['metal', 'acid', 'salt', 'hydrogen']),
      fact('reactivity and acid reactions', 'A more reactive metal gives a faster and more vigorous reaction with acid.', ['more reactive', 'faster', 'vigorous']),
      fact('salts from hydrochloric acid', 'Hydrochloric acid forms chloride salts.', ['hydrochloric acid', 'chloride']),
      fact('salts from sulfuric acid', 'Sulfuric acid forms sulfate salts.', ['sulfuric acid', 'sulfate']),
      fact('why gold does not react with acid', 'Gold is below hydrogen in the reactivity series and cannot displace it from the acid.', ['gold', 'below hydrogen', 'cannot displace', 'no reaction'])
    ]
  ),
  lesson(
    'alkali-metals',
    'Acids and alkalis',
    'Alkali metals',
    138,
    'group-one',
    'Group 1 metals are soft, low-density and increasingly reactive down the group.',
    [
      'Alkali metals occupy Group 1. They are soft, have low densities and melting points, and are stored in oil to keep air and water away.',
      'Reactivity increases down Group 1, while melting points decrease.',
      'The general reaction is alkali metal + water -> metal hydroxide + hydrogen.',
      'The metal hydroxide solution is alkaline, with pH above 7. Hydrogen gas causes fizzing and may ignite in more vigorous reactions.',
      'Lithium fizzes on water; potassium reacts more strongly and may ignite the hydrogen. Caesium would react even more fiercely.'
    ],
    ['Group 1', 'alkali metal', 'metal hydroxide', 'hydrogen', 'reactivity'],
    [
      fact('alkali metal properties', 'Group 1 metals are soft, low-density, low-melting and very reactive.', ['soft', 'low density', 'low melting', 'reactive']),
      fact('reactivity down Group 1', 'Reactivity increases as you go down Group 1.', ['reactivity', 'increases', 'down']),
      fact('melting points down Group 1', 'Melting points decrease as you go down Group 1.', ['melting points', 'decrease', 'down']),
      fact('alkali metals with water', 'They form a metal hydroxide and hydrogen gas.', ['metal hydroxide', 'hydrogen']),
      fact('why alkali metals are stored in oil', 'Oil keeps reactive alkali metals away from air and water.', ['oil', 'air', 'water', 'reactive'])
    ]
  ),
  lesson(
    'neutralisation',
    'Acids and alkalis',
    'Neutralisation',
    140,
    'neutralise',
    'Bases remove acidity, with the products depending on whether the base is an oxide, hydroxide or carbonate.',
    [
      'Neutralisation is a chemical reaction in which a base raises an acid toward pH 7.',
      'Acid + metal oxide -> salt + water, and acid + metal hydroxide -> salt + water.',
      'Acid + metal carbonate -> salt + carbon dioxide + water.',
      'Hydrochloric acid makes chlorides, sulfuric acid makes sulfates and nitric acid makes nitrates.',
      'An indicator with a sharp colour change, such as litmus, phenolphthalein or methyl orange, is useful for detecting the end point.'
    ],
    ['neutralisation', 'base', 'salt', 'carbonate', 'indicator'],
    [
      fact('neutralisation', 'Neutralisation is when a base reacts with an acid and raises its pH toward 7.', ['base', 'acid', 'pH', '7']),
      fact('acid plus metal oxide', 'Acid plus metal oxide forms a salt and water.', ['acid', 'metal oxide', 'salt', 'water']),
      fact('acid plus metal carbonate', 'Acid plus metal carbonate forms a salt, carbon dioxide and water.', ['acid', 'metal carbonate', 'salt', 'carbon dioxide', 'water']),
      fact('names of salts', 'Hydrochloric acid makes chlorides, sulfuric acid makes sulfates and nitric acid makes nitrates.', ['hydrochloric', 'chloride', 'sulfuric', 'sulfate', 'nitric', 'nitrate']),
      fact('choosing an end-point indicator', 'Use an indicator with a sudden colour change, such as litmus, phenolphthalein or methyl orange.', ['sudden colour change', 'litmus', 'phenolphthalein', 'methyl orange'])
    ]
  ),
  lesson(
    'exo-endo',
    'Energy changes',
    'Exothermic and endothermic reactions',
    144,
    'energy',
    'Exothermic reactions warm their surroundings, while endothermic reactions take energy in and cool them.',
    [
      'Exothermic reactions transfer energy to the surroundings, usually causing a temperature rise.',
      'Combustion, neutralisation and many oxidation reactions are exothermic. Hand warmers and self-heating cans use exothermic reactions.',
      'Endothermic reactions take energy from the surroundings and usually cause a temperature fall.',
      'Thermal decomposition is endothermic because energy must be supplied to break a compound down.',
      'Instant cold packs mix substances in an endothermic process and cool as they absorb energy.'
    ],
    ['exothermic', 'endothermic', 'surroundings', 'temperature', 'energy transfer'],
    [
      fact('an exothermic reaction', 'An exothermic reaction transfers energy to the surroundings and raises their temperature.', ['energy', 'to surroundings', 'temperature rises']),
      fact('exothermic examples', 'Combustion, neutralisation and many oxidation reactions are exothermic.', ['combustion', 'neutralisation', 'oxidation']),
      fact('an endothermic reaction', 'An endothermic reaction takes energy from the surroundings and lowers their temperature.', ['energy', 'from surroundings', 'temperature falls']),
      fact('thermal decomposition energy', 'Thermal decomposition is endothermic because heat energy must be supplied.', ['thermal decomposition', 'endothermic', 'heat supplied']),
      fact('instant cold packs', 'Cold packs use an endothermic reaction that absorbs energy and lowers temperature.', ['endothermic', 'absorbs energy', 'lowers temperature'])
    ]
  ),
  lesson(
    'rates-of-reaction',
    'Energy changes',
    'Rates of reaction',
    146,
    'rate',
    'Reaction rate depends on how often particles collide successfully and how energetic those collisions are.',
    [
      'Rate of reaction means how quickly reactants are changed into products. Successful particle collisions are required.',
      'Higher temperature makes particles move faster, causing more frequent and more energetic collisions.',
      'Higher concentration or gas pressure places more particles in the same volume, increasing collision frequency.',
      'A larger surface area exposes more solid particles. A catalyst provides a lower-energy pathway and is not used up.',
      'Rates can be measured by mass loss, gas volume, time for a precipitate to hide a cross, or time for a colour change.'
    ],
    ['rate of reaction', 'collision', 'concentration', 'surface area', 'catalyst'],
    [
      fact('temperature and reaction rate', 'Higher temperature makes particles faster, so collisions are more frequent and energetic.', ['higher temperature', 'faster', 'collisions', 'energetic']),
      fact('concentration and reaction rate', 'Higher concentration puts more particles in the same volume and increases collision frequency.', ['more particles', 'same volume', 'collisions', 'increases']),
      fact('surface area and reaction rate', 'Smaller pieces have greater surface area, exposing more particles for collisions.', ['smaller pieces', 'greater surface area', 'more collisions']),
      fact('a catalyst', 'A catalyst speeds a reaction using a lower-energy pathway and is not used up.', ['speeds', 'lower energy', 'not used up']),
      fact('measuring reaction rate', 'Rate can be measured using mass loss, gas volume, precipitation or colour change over time.', ['mass loss', 'gas volume', 'time'])
    ]
  ),
  lesson(
    'metal-extraction',
    'Materials',
    'Metal extraction',
    150,
    'extraction',
    'A metal\'s position relative to carbon in the reactivity series determines how it can be extracted from its ore.',
    [
      'Many metals occur in ores, which are rocks containing metal compounds. Extraction separates useful metal from the ore.',
      'Metals less reactive than carbon can be extracted from their oxides by reduction with carbon.',
      'In a blast furnace, carbon removes oxygen from iron oxide: iron oxide + carbon -> iron + carbon dioxide.',
      'Metals more reactive than carbon cannot be displaced by carbon and require electrolysis.',
      'Very unreactive metals such as gold and silver may occur naturally as pure metals.'
    ],
    ['ore', 'extraction', 'reduction', 'carbon', 'electrolysis'],
    [
      fact('an ore', 'An ore is a rock containing enough of a metal compound for the metal to be extracted.', ['rock', 'metal compound', 'extracted']),
      fact('metals below carbon', 'A metal less reactive than carbon can be extracted from its oxide by reduction with carbon.', ['less reactive', 'carbon', 'metal oxide', 'reduction']),
      fact('iron extraction with carbon', 'Carbon removes oxygen from iron oxide, leaving iron and forming carbon dioxide.', ['carbon', 'removes oxygen', 'iron oxide', 'iron', 'carbon dioxide']),
      fact('metals above carbon', 'Metals more reactive than carbon require electrolysis because carbon cannot displace them.', ['more reactive', 'carbon', 'electrolysis']),
      fact('gold and silver extraction', 'Gold and silver are so unreactive that they may be found as pure metals.', ['gold', 'silver', 'unreactive', 'pure'])
    ]
  ),
  lesson(
    'crude-oil',
    'Materials',
    'Crude oil',
    152,
    'distillation',
    'Fractional distillation separates crude oil hydrocarbons by their different boiling points.',
    [
      'Crude oil formed from remains of organisms such as algae and plankton buried under sediment and changed by heat and pressure over millions of years.',
      'It is a mixture mainly made of hydrocarbons, compounds containing hydrogen and carbon.',
      'Crude oil is vaporised and enters a fractionating column that is hot at the bottom and cooler at the top.',
      'Fractions condense at different heights because they have different boiling points. Fractions include gases, petrol, kerosene, diesel, fuel oil and lubricating oils.',
      'Burning crude-oil fuels releases carbon dioxide, a greenhouse gas that contributes to global warming.'
    ],
    ['crude oil', 'hydrocarbon', 'fractional distillation', 'boiling point', 'fraction'],
    [
      fact('how crude oil formed', 'Dead organisms were buried by sediment and changed by heat and pressure over millions of years.', ['dead organisms', 'sediment', 'heat', 'pressure', 'millions']),
      fact('hydrocarbons', 'Hydrocarbons are compounds made from hydrogen and carbon.', ['compounds', 'hydrogen', 'carbon']),
      fact('the fractionating column', 'The column is hot at the bottom and cooler at the top.', ['hot', 'bottom', 'cooler', 'top']),
      fact('fractional distillation', 'Vaporised substances condense at different heights because they have different boiling points.', ['vapour', 'condense', 'different heights', 'boiling points']),
      fact('environmental impact of crude-oil fuels', 'Burning them releases carbon dioxide, which contributes to global warming.', ['burning', 'carbon dioxide', 'greenhouse gas', 'global warming'])
    ]
  ),
  lesson(
    'ceramics-polymers-composites',
    'Materials',
    'Ceramics, polymers and composites',
    154,
    'materials',
    'Material structures create useful combinations of hardness, flexibility, insulation, strength and low mass.',
    [
      'Ceramics are made by heating materials such as clay in a kiln. They are hard, brittle and resistant to high temperatures.',
      'Polymers are long chains made by joining many small monomers. Natural polymers include rubber and silk; synthetic polymers include polythene and PVC.',
      'Polymers can be light, flexible or rigid, mouldable, unreactive and good thermal and electrical insulators. Their slow breakdown creates waste problems.',
      'Composites combine materials so each keeps useful properties and the result is improved.',
      'Fibreglass combines glass fibres and plastic; concrete combines cement, sand and gravel; carbon fibre combines carbon fibres and polymer.'
    ],
    ['ceramic', 'polymer', 'monomer', 'composite', 'insulator'],
    [
      fact('ceramic properties', 'Ceramics are hard, brittle and heat resistant because they are fired at high temperature.', ['hard', 'brittle', 'heat resistant', 'kiln']),
      fact('a polymer', 'A polymer is a long chain made by joining many small molecules called monomers.', ['long chain', 'small molecules', 'monomers']),
      fact('polymer uses and problems', 'Polymers are light, mouldable and insulating, but many break down very slowly and create waste.', ['light', 'mouldable', 'insulating', 'slowly', 'waste']),
      fact('a composite', 'A composite combines two or more materials to create improved properties.', ['combines', 'two or more', 'materials', 'improved properties']),
      fact('fibreglass', 'Fibreglass combines glass fibres with plastic to make a strong, lightweight material.', ['glass fibres', 'plastic', 'strong', 'lightweight'])
    ]
  ),
  lesson(
    'earth-composition',
    'Earth and the atmosphere',
    'Composition of the Earth',
    158,
    'earth',
    'Earth has four main layers whose state, composition, temperature and movement differ with depth.',
    [
      'The rocky crust is the thinnest layer, about 6 to 70 km thick, and is divided into tectonic plates.',
      'The mantle is about 3000 km thick. Mostly solid rock flows slowly, and convection currents move tectonic plates.',
      'The outer core is liquid iron and nickel and contributes to Earth\'s magnetic field.',
      'The inner core is solid despite a temperature near 6000 degrees C because pressure is extremely high.',
      'The most abundant crust elements are oxygen, silicon, aluminium and iron, in that order.'
    ],
    ['crust', 'mantle', 'outer core', 'inner core', 'tectonic plate'],
    [
      fact('the crust', 'The crust is the thin outer rocky layer and is split into tectonic plates.', ['thin', 'outer', 'rock', 'tectonic plates']),
      fact('the mantle', 'The mantle is mostly solid rock that flows slowly; convection currents move plates.', ['solid rock', 'flows slowly', 'convection', 'plates']),
      fact('the outer core', 'The outer core is liquid iron and nickel and helps produce Earth\'s magnetic field.', ['liquid', 'iron', 'nickel', 'magnetic field']),
      fact('the inner core', 'The inner core is very hot but remains solid because of extreme pressure.', ['hot', 'solid', 'pressure']),
      fact('common elements in the crust', 'The four most abundant are oxygen, silicon, aluminium and iron.', ['oxygen', 'silicon', 'aluminium', 'iron'])
    ]
  ),
  lesson(
    'rock-cycle',
    'Earth and the atmosphere',
    'Types of rock and the rock cycle',
    160,
    'rocks',
    'Weathering, burial, heat, pressure, melting and cooling continually transform the three rock types.',
    [
      'Sedimentary rocks form when weathered sediment is transported, deposited in layers, compacted and cemented. Limestone and shale are examples.',
      'Metamorphic rocks form when existing rock experiences intense heat and pressure without melting. Shale can become slate and limestone can become marble.',
      'Igneous rocks form when molten rock, called magma, cools and solidifies.',
      'Extrusive igneous rock cools quickly above the surface and has small crystals; basalt is an example.',
      'Intrusive igneous rock cools slowly underground and has large crystals; granite is an example.'
    ],
    ['sedimentary', 'metamorphic', 'igneous', 'magma', 'rock cycle'],
    [
      fact('sedimentary rock formation', 'Sediment is deposited in layers, then compacted and cemented into rock.', ['sediment', 'layers', 'compacted', 'cemented']),
      fact('metamorphic rock formation', 'Existing rock is changed by intense heat and pressure without melting.', ['existing rock', 'heat', 'pressure', 'without melting']),
      fact('igneous rock formation', 'Igneous rock forms when molten magma cools and solidifies.', ['magma', 'cools', 'solidifies']),
      fact('extrusive igneous rock', 'It cools quickly above the surface and forms small crystals, such as basalt.', ['quickly', 'above surface', 'small crystals', 'basalt']),
      fact('intrusive igneous rock', 'It cools slowly underground and forms large crystals, such as granite.', ['slowly', 'underground', 'large crystals', 'granite'])
    ]
  ),
  lesson(
    'earth-resources',
    'Earth and the atmosphere',
    'Earth\'s resources',
    162,
    'resources',
    'Finite resources must be reduced, reused and recycled so they remain available and require less energy to replace.',
    [
      'Finite resources are limited and may run out. Water, land, fossil fuels, building materials, minerals and ores are important resources.',
      'Sustainable use meets present needs without preventing future generations from meeting theirs.',
      'Reduce means use less and create less waste; reuse means use an item again; recycle means process old materials into new products.',
      'Fossil fuels formed from dead organisms over millions of years, so they are finite. Plastics are made from oil.',
      'Recycling aluminium cans and plastics usually uses less energy and costs less than extracting or producing new material.'
    ],
    ['finite', 'sustainable', 'reduce', 'reuse', 'recycle'],
    [
      fact('a finite resource', 'A finite resource is limited and can run out because it is not replaced quickly.', ['limited', 'run out', 'not replaced']),
      fact('sustainable resource use', 'Use resources without exhausting them so they remain available for future generations.', ['not exhaust', 'available', 'future generations']),
      fact('reduce, reuse and recycle', 'Reduce uses less, reuse uses an item again, and recycle makes new products from old material.', ['reduce', 'less', 'reuse', 'again', 'recycle', 'new']),
      fact('why fossil fuels are finite', 'They take millions of years to form from dead organisms, far slower than we use them.', ['millions of years', 'dead organisms', 'slow', 'use']),
      fact('benefits of recycling aluminium', 'Recycling aluminium usually saves energy and money compared with extracting new metal.', ['saves energy', 'costs less', 'new metal'])
    ]
  ),
  lesson(
    'earth-atmosphere',
    'Earth and the atmosphere',
    'Earth\'s atmosphere',
    164,
    'atmosphere',
    'Earth\'s atmosphere changed over time and greenhouse gases now link human fuel use to global warming.',
    [
      'The modern atmosphere is about 78% nitrogen, 21% oxygen, 0.9% argon and 0.04% carbon dioxide, with small amounts of other gases.',
      'Early volcanic activity produced an atmosphere rich in carbon dioxide and water vapour. Cooling condensed water vapour to form oceans.',
      'Cyanobacteria and later plants carried out photosynthesis, removing carbon dioxide and releasing oxygen.',
      'Greenhouse gases absorb and re-emit infrared radiation, reducing energy loss to space and raising Earth\'s average temperature.',
      'Burning fossil fuels increases atmospheric carbon dioxide. Consequences include more extreme weather, melting ice and flooding of low-lying land.'
    ],
    ['atmosphere', 'nitrogen', 'photosynthesis', 'greenhouse gas', 'global warming'],
    [
      fact('modern atmosphere composition', 'It is about 78% nitrogen, 21% oxygen, 0.9% argon and 0.04% carbon dioxide.', ['78', 'nitrogen', '21', 'oxygen', 'argon', 'carbon dioxide']),
      fact('the early atmosphere', 'Volcanic activity produced mainly carbon dioxide and water vapour; cooling formed oceans.', ['volcanic', 'carbon dioxide', 'water vapour', 'oceans']),
      fact('cyanobacteria', 'Cyanobacteria photosynthesised, removing carbon dioxide and producing oxygen.', ['photosynthesis', 'carbon dioxide', 'oxygen']),
      fact('the greenhouse effect', 'Greenhouse gases absorb and re-emit infrared radiation, keeping more energy in the atmosphere and warming Earth.', ['greenhouse gases', 'infrared', 'energy', 'warming']),
      fact('fossil fuels and global warming', 'Burning fossil fuels adds carbon dioxide, increasing warming, extreme weather, ice melt and flood risk.', ['burning', 'carbon dioxide', 'warming', 'ice', 'flooding'])
    ]
  ),
  lesson(
    'carbon-cycle',
    'Earth and the atmosphere',
    'The carbon cycle',
    166,
    'carbon',
    'Carbon moves continuously among the atmosphere, living organisms, the ground and long-term fossil stores.',
    [
      'Atmospheric carbon is mainly carbon dioxide. Photosynthesis removes carbon dioxide and makes glucose using water and light.',
      'Plants and animals release carbon dioxide through respiration. Plants normally remove more through photosynthesis than they release.',
      'Decomposers such as bacteria and fungi break down dead organisms and release carbon dioxide.',
      'When decomposition is prevented, buried organic remains can form fossil fuels over millions of years.',
      'Burning coal, oil and gas in power stations and vehicles releases stored carbon dioxide and contributes to global warming.'
    ],
    ['carbon cycle', 'photosynthesis', 'respiration', 'decomposition', 'fossil fuel'],
    [
      fact('the carbon cycle', 'The carbon cycle is the continuous movement of carbon among the atmosphere, organisms and ground.', ['continuous', 'movement', 'carbon', 'atmosphere', 'organisms', 'ground']),
      fact('photosynthesis in the carbon cycle', 'Photosynthesis removes carbon dioxide from the atmosphere and stores carbon in glucose.', ['removes', 'carbon dioxide', 'glucose']),
      fact('processes that release carbon dioxide', 'Respiration, decomposition and combustion of fossil fuels release carbon dioxide.', ['respiration', 'decomposition', 'combustion']),
      fact('decomposers', 'Bacteria and fungi break down dead organisms into simpler substances and release carbon dioxide.', ['bacteria', 'fungi', 'dead organisms', 'carbon dioxide']),
      fact('planting more trees', 'More trees increase photosynthesis and remove more carbon dioxide from the atmosphere.', ['more trees', 'photosynthesis', 'remove', 'carbon dioxide'])
    ]
  )
].map((item, index) => ({ ...item, order: index + 1 }))

export function getChemistryLesson(id) {
  return chemistryLessons.find(item => item.id === id)
}

export function toPublicLesson(item) {
  const publicLesson = { ...item }
  delete publicLesson.facts
  return publicLesson
}
