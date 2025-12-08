import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Target,
  Plus,
  TrendingUp,
  Users,
  Music,
  DollarSign,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  X,
  Award,
  BarChart3,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { Goal } from '../types';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../services/supabaseService';

const GoalsPage: React.FC<{ onNavigate?: (view: string) => void }> = ({ onNavigate }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const data = await getGoals();
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const getGoalIcon = (type: string) => {
    switch (type) {
      case 'revenue': return <DollarSign size={20} />;
      case 'followers': return <Users size={20} />;
      case 'uploads': return <Music size={20} />;
      case 'plays': return <TrendingUp size={20} />;
      case 'sales': return <BarChart3 size={20} />;
      default: return <Target size={20} />;
    }
  };

  const getGoalColor = (type: string) => {
    switch (type) {
      case 'revenue': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'followers': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'uploads': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'plays': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'sales': return 'text-pink-400 bg-pink-400/10 border-pink-400/20';
      default: return 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/10';
      case 'active': return 'text-blue-400 bg-blue-400/10';
      case 'paused': return 'text-yellow-400 bg-yellow-400/10';
      case 'failed': return 'text-red-400 bg-red-400/10';
      default: return 'text-neutral-400 bg-neutral-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={12} />;
      case 'active': return <Zap size={12} />;
      case 'paused': return <Clock size={12} />;
      case 'failed': return <X size={12} />;
      default: return <Clock size={12} />;
    }
  };

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getDaysRemaining = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredGoals = goals.filter(goal => {
    if (filter === 'all') return true;
    if (filter === 'active') return goal.status === 'active';
    if (filter === 'completed') return goal.status === 'completed';
    if (filter === 'type') return goal.type === filter;
    return goal.status === filter;
  });

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const totalTargetValue = goals.reduce((sum, goal) => sum + Number(goal.target), 0);
  const totalCurrentValue = goals.reduce((sum, goal) => sum + Number(goal.current), 0);

  const handleDeleteGoal = async (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(goalId);
        setGoals(goals.filter(g => g.id !== goalId));
      } catch (error) {
        console.error('Error deleting goal:', error);
        alert('Failed to delete goal');
      }
    }
  };

  const handleToggleStatus = async (goal: Goal) => {
    try {
      const newStatus = goal.status === 'active' ? 'paused' : 'active';
      const updated = await updateGoal(goal.id, { status: newStatus });
      setGoals(goals.map(g => g.id === goal.id ? updated : g));
    } catch (error) {
      console.error('Error updating goal status:', error);
      alert('Failed to update goal status');
    }
  };

  const handleCreateGoal = async (newGoal: Omit<Goal, 'id' | 'createdAt'>) => {
    try {
      const created = await createGoal(newGoal);
      setGoals([created, ...goals]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('Failed to create goal');
    }
  };

  const handleUpdateGoal = async (updatedGoal: Goal) => {
    try {
      const updated = await updateGoal(updatedGoal.id, updatedGoal);
      setGoals(goals.map(g => g.id === updatedGoal.id ? updated : g));
      setSelectedGoal(null);
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to update goal');
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-r-2 border-primary/50 rounded-full animate-spin animation-delay-150"></div>
              <div className="absolute inset-4 border-b-2 border-primary/20 rounded-full animate-spin animation-delay-300"></div>
            </div>
            <p className="text-primary font-mono text-xs tracking-[0.2em] animate-pulse">LOADING_GOALS...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-32 pt-6 px-6 lg:px-8 animate-in fade-in duration-500">
      {/* Back Button */}
      <Link
        to="/dashboard"
        className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-6 group inline-flex"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-wider">Back to Dashboard</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Goals</h1>
          <p className="text-neutral-500 text-sm">Set and track your music career goals.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-colors text-xs"
          >
            <Plus size={14} />
            Create Goal
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-400/10 rounded-lg text-blue-400">
              <Target size={20} />
            </div>
            <h3 className="text-sm font-bold text-neutral-400 uppercase">Active Goals</h3>
          </div>
          <p className="text-2xl font-black text-white">{activeGoals.length}</p>
        </div>

        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-400/10 rounded-lg text-green-400">
              <CheckCircle size={20} />
            </div>
            <h3 className="text-sm font-bold text-neutral-400 uppercase">Completed</h3>
          </div>
          <p className="text-2xl font-black text-white">{completedGoals.length}</p>
        </div>

        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-400/10 rounded-lg text-purple-400">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-sm font-bold text-neutral-400 uppercase">Success Rate</h3>
          </div>
          <p className="text-2xl font-black text-white">
            {goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0}%
          </p>
        </div>

        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-400/10 rounded-lg text-orange-400">
              <Award size={20} />
            </div>
            <h3 className="text-sm font-bold text-neutral-400 uppercase">Avg Progress</h3>
          </div>
          <p className="text-2xl font-black text-white">
            {goals.length > 0 ? Math.round((totalCurrentValue / (totalTargetValue || 1)) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filter === 'all' ? 'bg-white text-black' : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
        >
          All Goals
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filter === 'active' ? 'bg-white text-black' : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filter === 'completed' ? 'bg-white text-black' : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter('revenue')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filter === 'revenue' ? 'bg-white text-black' : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
        >
          Revenue
        </button>
        <button
          onClick={() => setFilter('followers')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${filter === 'followers' ? 'bg-white text-black' : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
            }`}
        >
          Followers
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredGoals.map((goal) => {
          const progress = calculateProgress(goal.current, goal.target);
          const daysRemaining = getDaysRemaining(goal.deadline);
          const isOverdue = daysRemaining < 0 && goal.status === 'active';

          return (
            <div key={goal.id} className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6 hover:border-white/20 transition-colors">
              {/* Goal Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${getGoalColor(goal.type)}`}>
                    {getGoalIcon(goal.type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{goal.title}</h3>
                    <p className="text-sm text-neutral-400 capitalize">{goal.type} Goal</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase ${getStatusColor(goal.status)}`}>
                  {getStatusIcon(goal.status)}
                  {goal.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-400">Progress</span>
                  <span className="text-white font-mono">{goal.current} / {goal.target}</span>
                </div>
                <div className="w-full bg-neutral-900 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${goal.status === 'completed' ? 'bg-green-500' : 'bg-primary'
                      }`}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-neutral-500">{Math.round(progress)}% complete</span>
                  {goal.status === 'active' && (
                    <span className={`${isOverdue ? 'text-red-400' : 'text-neutral-400'}`}>
                      {isOverdue ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
                    </span>
                  )}
                </div>
              </div>

              {/* Goal Details */}
              {goal.description && (
                <p className="text-sm text-neutral-400 mb-4">{goal.description}</p>
              )}

              <div className="flex justify-between items-center text-sm mb-4">
                <span className="text-neutral-500">Category:</span>
                <span className="text-white capitalize">{goal.category}</span>
              </div>

              <div className="flex justify-between items-center text-sm mb-6">
                <span className="text-neutral-500">Deadline:</span>
                <span className={`${isOverdue ? 'text-red-400' : 'text-white'}`}>
                  {new Date(goal.deadline).toLocaleDateString()}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedGoal(goal)}
                  className="flex-1 py-2 px-3 bg-white/5 text-white font-bold rounded-lg text-xs hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                >
                  <Edit size={12} />
                  Edit
                </button>
                <button
                  onClick={() => handleToggleStatus(goal)}
                  className="flex-1 py-2 px-3 bg-primary text-black font-bold rounded-lg text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                >
                  {goal.status === 'active' ? <Clock size={12} /> : <Zap size={12} />}
                  {goal.status === 'active' ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="py-2 px-3 bg-red-500/10 text-red-400 font-bold rounded-lg text-xs hover:bg-red-500/20 transition-colors flex items-center justify-center"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}

        {filteredGoals.length === 0 && (
          <div className="col-span-full py-16 text-center border border-dashed border-neutral-800 rounded-xl bg-white/5">
            <Target size={48} className="mx-auto mb-4 text-neutral-600" />
            <p className="text-neutral-500 font-mono mb-4">No goals found.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary/10 text-primary border border-primary/50 rounded hover:bg-primary hover:text-black transition-colors font-mono text-xs uppercase tracking-wider"
            >
              Create Your First Goal
            </button>
          </div>
        )}
      </div>

      {/* Create Goal Modal */}
      {showCreateModal && (
        <CreateGoalModal onClose={() => setShowCreateModal(false)} onGoalCreated={handleCreateGoal} />
      )}

      {/* Edit Goal Modal */}
      {selectedGoal && (
        <EditGoalModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onGoalUpdated={handleUpdateGoal}
        />
      )}
    </div>
  );
};

// Create Goal Modal Component
const CreateGoalModal: React.FC<{ onClose: () => void; onGoalCreated: (goal: Omit<Goal, 'id' | 'createdAt'>) => void }> = ({ onClose, onGoalCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'revenue' as Goal['type'],
    target: '',
    deadline: '',
    description: '',
    category: 'monthly' as Goal['category']
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newGoal: Omit<Goal, 'id' | 'createdAt'> = {
        title: formData.title,
        type: formData.type,
        target: parseFloat(formData.target),
        current: 0,
        deadline: formData.deadline,
        status: 'active',
        description: formData.description,
        category: formData.category
      };

      await onGoalCreated(newGoal);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0a0a0a] border border-neutral-700 rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create New Goal</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Goal Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter goal title"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Goal['type'] })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
              >
                <option value="revenue">Revenue</option>
                <option value="followers">Followers</option>
                <option value="uploads">Uploads</option>
                <option value="plays">Plays</option>
                <option value="sales">Sales</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Goal['category'] })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Target Value</label>
              <input
                type="number"
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                placeholder="0"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Deadline</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your goal..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none h-20 resize-none"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-white/5 text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Goal Modal Component
const EditGoalModal: React.FC<{ goal: Goal; onClose: () => void; onGoalUpdated: (goal: Goal) => void }> = ({ goal, onClose, onGoalUpdated }) => {
  const [formData, setFormData] = useState({
    title: goal.title,
    current: goal.current.toString(),
    deadline: goal.deadline,
    description: goal.description || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updatedGoal: Goal = {
        ...goal,
        title: formData.title,
        current: parseFloat(formData.current),
        deadline: formData.deadline,
        description: formData.description,
        status: parseFloat(formData.current) >= goal.target ? 'completed' : goal.status
      };

      await onGoalUpdated(updatedGoal);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0a0a0a] border border-neutral-700 rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Edit Goal</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded text-neutral-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Goal Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Current Progress</label>
            <input
              type="number"
              value={formData.current}
              onChange={(e) => setFormData({ ...formData, current: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Deadline</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase mb-2 block">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none h-20 resize-none"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-white/5 text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalsPage;