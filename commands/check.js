const { ifError } = require('assert');
const chalk = require('chalk');
const fs = require('fs');
const { maxHeaderSize } = require('http');

exports.command = 'check [examples]';
exports.desc = 'Generate regex validator given tab-seperated file of positive and negative examples';
exports.builder = yargs => {
    yargs.options({
    });
};

function loadExamples(examples) {

    let positive = [];
    let negative = [];
    try {
        let lines =  fs.readFileSync( examples ).toString().split( /\r?\n/g );

        let nonEmpty = (a) => a.trim().length > 0;
        for (var line of lines )
        {
            let atoms = line.split(/\s+/g);
            if( atoms.length == 2 ) {
                if( nonEmpty(atoms[0]) ) {
                    positive.push( atoms[0] );
                }
                if( nonEmpty(atoms[1]) ) {
                    negative.push( atoms[1] );
                }
            }
            else if( nonEmpty(atoms[0]) ) {
                positive.push( atoms[0] );
            }
        }
        
        return [positive,negative];

    } catch (err) {
        console.log( chalk.red(err.message) );
        process.exit(1)
    }
}


function* subsets(array, offset = 0) {
    while (offset < array.length) {
      let first = array[offset++];
      for (let subset of subsets(array, offset)) {
        subset.push(first);
        yield subset;
      }
    }
    yield [];
}

function partialScore(regexEval) {
    // [ '5', index: 0, input: '5', groups: undefined ]
    if( regexEval === null ) {
        return 0
    }
    let partial = (regexEval[0].length / (regexEval.input.length));
    return partial;
}

function check(positive, negative, rePartial, reFull) {

    let score = 0;
    for( let example of positive ) {

        if( reFull.test(example) ) {
            score+=1
        } else {
            let partial = partialScore( rePartial.exec(example) );
            score += partial
        }
    }
    for( let example of negative ) {
        if( reFull.test(example) ) {
            console.log( chalk.red("Matched failure"), reFull, example )
            score+=-1
        }
    }
    return score;
}

function evaluate(solutions, positive, negative) {

    let candidates = [];
    while( solutions.length > 0 )
    {
        var solution = solutions.pop();

        try {
            const rePartial = new RegExp( solution.state.join('') );
            const reFull = new RegExp( '^' + solution.state.join('') + "$");
            let score = check(positive, negative, rePartial, reFull);
            solution.score = Math.round(score);
            solution.re = reFull;

            candidates.push( solution );
        } catch (err) {
            console.log( err );
        }
    }

    return candidates;
}


function solve(positive, negative, maxGenerations=10) {

    let seed = ['\\d+', '\\w+' ]
    let initial = subsets(seed.reverse());
    let solutions = [];
    for( let state of initial ) {
        solutions.push( {state: state, score: 0} )
    }

    let perfectScore = positive.length;

    let candidates = [];
    for( let i = 0; i<maxGenerations; i++ ) {
        candidates = evaluate(solutions, positive, negative);
        for (let candidate of candidates ) {

            console.log( candidate.score, candidate.re );

            if( candidate.score === perfectScore ) {
               console.log(chalk.bgGreenBright("[Solved]"), chalk.underline("Generated regex:"), candidate.re)
               return;
            }
        }

        solutions = promote(candidates);
    }
    candidates.sort( (a,b) => b.score - a.score );
    let candidate = candidates[0];

    console.log(chalk.bgYellowBright("[Timed out]"), chalk.underline("Best partial solution regex:"), candidate.re)


}

function promote(candidates) {

    let solutions = []

    candidates.sort( (a,b) => b.score - a.score );
    candidates.splice(5,candidates.length);

    for( let candidate of candidates ) {
        for( let mutatant of extend(candidate) ) {
            solutions.push( mutatant );
        }

        for( let mutatant of specificity(candidate) ) {
            solutions.push( mutatant );
        }
    }


    return solutions;
}

let operators = ['[-]', '\\d+'];
function extend(solution) {

    let states = [];

    for( let op of operators ) {
        let newState = solution.state.slice();
        newState.push(op)
        // console.log( solution, newState )
        states.push( {state: newState, score: 0})
    }

    // console.log( chalk.blue( JSON.stringify( states)  );

    return states;
}

function specificity(solution, maxSpecificity=3) {
    let states = [];
    /// Try replacing X+ with X{n}
    for( let i = 0; i < solution.state.length; i++ ) {
        if( solution.state[i].indexOf("+") > 0 ) 
        {
            for( let n=0 ; n <= maxSpecificity; n++ ) {
                let newState = solution.state.slice();
                newState[i] = solution.state[i].replace("+", `{${n}}`)
                states.push( {state: newState, score: 0} );
            }
        }
    }    
    return states;
}


exports.handler = async argv => {
    const { examples } = argv;

    let [positive,negative] = loadExamples( examples );

    console.log( `Loaded ${chalk.blue(positive.length)} +examples, ${chalk.red(negative.length)} -examples from ${chalk.white(examples)})` );
  
    solve( positive, negative );

};