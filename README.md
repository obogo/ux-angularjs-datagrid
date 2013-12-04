## Concept 1 ##
recycle rows down.

- take scroll offset into consideration.
- check to see how far a row will need to be moved.
- if the row needs to be moved less than half of the visible area then move dom from top to bottom.
- else adjust every row in a renderAll pattern.
- scrolling will use scrollTop and adjust the speed for a smooth scrolling experience.

## Concept 2 ##
render pages at a time.

- render a page. When scrolled past that page, show an infinite scroll and then show the new results.
- Keep up to 2 pages in dom. So that as you scroll to load the 3rd. Drop the first on render of the 3rd page. 
- To optimize digests. Deactivate rows that are not currently visible.
- This would allow the pages to be long. As in up to 100 or so per page.

## Concept 3 (cannot see stuff as it goes by) ##

- large div on top and bottom to push for height of scrollbar.
- rows that are not visible are display none so no heights are calculated.
- heights have an initial calculation to determine position. recalculated when digested.

## Concept 4 * ##

- all rows are absolute
- position them with heights calculated from the template before initial innerHTML.
- then no resize events because they are all in place.

## Concept 5 ** ##

- container chunks to break down the amount of dom that is shown.
- this will make it so that it doesn't resize all 5000, but just ones in the visible containers, and then adjusts the containers.
	- combined with concept 3 then we would be able to hide chunks that are out of view and then display before they come into view making a top and bottom spacer that will take up all of the space above and below to prevent having additional resizes.
	- this could make this support MANY more rows.