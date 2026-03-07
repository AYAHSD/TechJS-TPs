const todoList = [{
  name: 'review course',
  dueDate: '2025-09-29'
}];

renderTodoList();

function renderTodoList() {
  // put the todos into a list structure so they’re easier to style
  let todoListHTML = '<ul class="todo-list-items">';

  todoList.forEach((todo, index) => {
    todoListHTML += `
      <li class="todo-item">
        <div class="todo-content">
          <span class="todo-name">${todo.name}</span>
          <span class="todo-due-date">${todo.dueDate}</span>
        </div>
        <button class="js-delete-button" data-index="${index}">Delete</button>
      </li>
    `;
  });

  todoListHTML += '</ul>';

  // inject the generated HTML into the page
  document.querySelector('.js-todo-list').innerHTML = todoListHTML;

  // wire up delete buttons after rendering
  document.querySelectorAll('.js-delete-button').forEach(button => {
    button.addEventListener('click', () => {
      const index = button.dataset.index;
      todoList.splice(index, 1);
      renderTodoList();
    });
  });
}

document.querySelector('.js-add-todo-button')
  .addEventListener('click', () => {
    addTodo();
  });

function addTodo() {
  const inputElement = document.querySelector('.js-name-input');
  const name = inputElement.value;

  const dateInputElement = document.querySelector('.js-due-date-input');
  const dueDate = dateInputElement.value;

  // Add these values to the variable "todoList"
  if (name && dueDate) {
    todoList.push({ name, dueDate });
  }

  // reset inputs for next entry
  inputElement.value = '';
  dateInputElement.value = '';

  renderTodoList();
}