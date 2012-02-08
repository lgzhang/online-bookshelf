# online-bookshelf

An interface for showing and sharing my reading on kindle.

## Introduction

The code consists a book.html file which uses JavaScript and CSS to display those HTML files. There are two JavaScript file:

* reader.js initialize and load the page.
* fade.js implement image fade-in and fade-out in response to the mouse position.

## Usage

You should add 'archive/contents.json' and 'archive/bucket-*.html' under main dir, the contents.json should has format:

`
	{
        "buckets" : [

                { "path":"archive/bucket-1.html" },

                { "path":"archive/bucket-2.html" },

                { "path":"archive/bucket-3.html" }

		...

     ]

}
`

the bucket-*.html should has format:

`
     <div class="item">

         the book's content

     </div>

     ....
`

one bucket-*.html file can contain eight "item" div at most.
