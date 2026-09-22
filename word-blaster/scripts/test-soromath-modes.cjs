const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const soroRoot = path.join(__dirname, '..', 'public', 'soromath', 'template1eqs')

function runFileWithAssertions(filename, assertions) {
  const source = fs.readFileSync(path.join(soroRoot, filename), 'utf8')
  const context = vm.createContext({ console })
  vm.runInContext(`${source}\n${assertions}`, context, { filename })
}

runFileWithAssertions('signedintegerfuncs.js', `
  signedIntegerDeck = [];
  const cases = [];
  for(let i = 0; i < 16; i++) cases.push(buildSignedIntegerQuestion(signedIntegerPreset));
  const keys = new Set(cases.map(item => item.operation + ':' + item.signs.join(',')));
  if(keys.size !== 16) throw new Error('Signed integer deck did not cover all 16 cases');
  for(const item of cases){
    if(!Number.isInteger(item.answer)) throw new Error('Signed integer answer was not an integer');
    if(item.operation === '/' && !Number.isInteger(item.answer)) throw new Error('Division was not exact');
  }
  if(!signedIntegerValidate(-4, '-4')) throw new Error('Negative answer validation failed');
  if(signedIntegerValidate(-4, '--4')) throw new Error('Malformed negative answer was accepted');
`)

runFileWithAssertions('areaperimeterfuncs.js', `
  const directions = ['area', 'perimeter', 'reverse-area', 'reverse-perimeter'];
  for(const shape of areaPerimeterShapes){
    for(const direction of directions){
      const item = buildAreaPerimeterQuestion(areaPerimeterPreset, { shape, direction });
      if(!Number.isFinite(item.answer) || item.answer <= 0){
        throw new Error(shape + ' ' + direction + ' produced an invalid answer');
      }
      if(!item.prompt || !item.caseName) throw new Error('Question metadata is incomplete');
    }
  }
  const square = buildAreaPerimeterQuestion(areaPerimeterPreset, { shape: 'square', direction: 'area' });
  if(!areaPerimeterValidate(square.answer, String(square.answer))) throw new Error('Geometry answer validation failed');
  areaPerimeterRefillDeck('hard');
  if(areaPerimeterDecks.hard.length !== 54) throw new Error('Hard deck should contain 54 balanced cases');
  areaPerimeterRefillDeck('easy');
  if(areaPerimeterDecks.easy.length !== 36) throw new Error('Easy deck should include forward and reverse cases');
`)

console.log('SoroMath signed-integer and area/perimeter mode tests passed.')
