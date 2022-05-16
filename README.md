# Program synthesis for regex

Simple demo of program synthesis based on reading positive and negative examples.
Generates regex solution that will properly validate input and reject negative examples.

### Example runs

Number matcher.

```bash
$ node index.js check examples/numbers.tsv
0 /^$/
5 /^\d+$/
[Solved] Generated regex: /^\d+$/
```

Phone number matcher.

```bash
$ node index.js check examples/phone.tsv
...
13 /^\d+[-]\d+[-]\d{3}$/
11 /^\d+[-]\d+[-]\d{2}$/
10 /^\d+[-]\d+[-]\d{1}$/
9 /^\d+[-]\d+[-]\d{0}$/
14 /^\d+[-]\d{3}[-]\d+$/
[Solved] Generated regex: /^\d+[-]\d{3}[-]\d+$/
```


